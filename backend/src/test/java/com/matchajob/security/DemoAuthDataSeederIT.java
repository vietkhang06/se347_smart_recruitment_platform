package com.matchajob.security;

import com.matchajob.MatchaJobApplication;
import com.matchajob.security.seed.DemoAuthDataSeeder;
import com.matchajob.security.seed.DemoSeedProperties;
import com.matchajob.user.model.CandidateProfile;
import com.matchajob.user.model.Company;
import com.matchajob.user.model.User;
import com.matchajob.user.repository.CandidateProfileRepository;
import com.matchajob.user.repository.CompanyMemberRepository;
import com.matchajob.user.repository.CompanyRepository;
import com.matchajob.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(classes = MatchaJobApplication.class)
@ActiveProfiles("test")
@Transactional
@DisplayName("DemoAuthDataSeeder Integration & Production-Safety Tests")
class DemoAuthDataSeederIT {

    static final String ADMIN_PASS = "DemoAdmin#2026!Safe";
    static final String EMPLOYER_PASS = "DemoEmployer#2026!Safe";
    static final String CANDIDATE_PASS = "DemoCandidate#2026!Safe";

    @Autowired
    private ApplicationContext applicationContext;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CandidateProfileRepository candidateProfileRepository;

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private CompanyMemberRepository companyMemberRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JdbcClient jdbcClient;

    private DemoAuthDataSeeder createSeeder(MockEnvironment env, DemoSeedProperties props) {
        return new DemoAuthDataSeeder(
                env,
                props,
                userRepository,
                candidateProfileRepository,
                companyRepository,
                companyMemberRepository,
                passwordEncoder,
                jdbcClient
        );
    }

    private DemoSeedProperties validEnabledProps() {
        DemoSeedProperties props = new DemoSeedProperties();
        props.setEnabled(true);
        props.setAdminPassword(ADMIN_PASS);
        props.setEmployerPassword(EMPLOYER_PASS);
        props.setCandidatePassword(CANDIDATE_PASS);
        return props;
    }

    @Test
    @DisplayName("1. DemoAuthDataSeeder bean is NOT registered in default test profile (opt-in disabled)")
    void seederBean_isNotRegisteredInTestProfile() {
        assertThat(applicationContext.getBeansOfType(DemoAuthDataSeeder.class)).isEmpty();
    }

    @Test
    @DisplayName("2. Runtime fail-closed guard rejects prod, staging, test, composite dev+prod, and APP_ENV=production")
    void runtimeSafetyGuard_rejectsForbiddenProfilesAndAppEnv() {
        DemoSeedProperties props = validEnabledProps();

        for (String forbidden : List.of("prod", "production", "staging", "uat", "preprod")) {
            MockEnvironment env = new MockEnvironment();
            env.setActiveProfiles(forbidden);
            DemoAuthDataSeeder seeder = createSeeder(env, props);
            assertThatThrownBy(() -> seeder.validateRuntimeSafety(env, "development"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("FATAL CONFIGURATION");
        }

        // Composite profile dev + prod must still be rejected
        MockEnvironment composite = new MockEnvironment();
        composite.setActiveProfiles("dev", "prod");
        DemoAuthDataSeeder compositeSeeder = createSeeder(composite, props);
        assertThatThrownBy(() -> compositeSeeder.validateRuntimeSafety(composite, "development"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("forbidden under active profile 'prod'");

        // APP_ENV=production with dev profile must be rejected
        MockEnvironment devEnv = new MockEnvironment();
        devEnv.setActiveProfiles("dev");
        DemoAuthDataSeeder devSeeder = createSeeder(devEnv, props);
        assertThatThrownBy(() -> devSeeder.validateRuntimeSafety(devEnv, "production"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("APP_ENV='production'");

        // Unapproved profile (test) must be rejected
        MockEnvironment testEnv = new MockEnvironment();
        testEnv.setActiveProfiles("test");
        DemoAuthDataSeeder testSeeder = createSeeder(testEnv, props);
        assertThatThrownBy(() -> testSeeder.validateRuntimeSafety(testEnv, "development"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("requires an explicitly approved profile");

        // Approved dev profile with development APP_ENV passes guard
        assertThatCode(() -> devSeeder.validateRuntimeSafety(devEnv, "development"))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("3. Password policy rejects blank, placeholder, short, and weak passwords without leaking input")
    void passwordPolicy_rejectsWeakOrPlaceholderPasswords() {
        assertThatThrownBy(() -> DemoAuthDataSeeder.validatePassword("admin", ""))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> DemoAuthDataSeeder.validatePassword("admin", "replace_with_local_demo_admin_password"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageNotContaining("replace_with_local_demo_admin_password");
        assertThatThrownBy(() -> DemoAuthDataSeeder.validatePassword("employer", "Short1!"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageNotContaining("Short1!");
        assertThatThrownBy(() -> DemoAuthDataSeeder.validatePassword("candidate", "alllowercasepassword123"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageNotContaining("alllowercasepassword123");
    }

    @Test
    @DisplayName("4. First run seeds all 6 demo accounts with BCrypt hashes and complete ownership records")
    void seedDemoAccounts_firstRun_createsAllRolesAndOwnership() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("dev");
        DemoAuthDataSeeder seeder = createSeeder(env, validEnabledProps());

        DemoAuthDataSeeder.SeedSummary summary = seeder.seedDemoAccounts();
        assertThat(summary.createdUsers()).isEqualTo(6);
        assertThat(summary.skippedExistingUsers()).isZero();
        assertThat(summary.conflictSkippedUsers()).isZero();

        // Admin + permissions
        User admin = userRepository.findByEmail(DemoAuthDataSeeder.DEMO_ADMIN_EMAIL).orElseThrow();
        assertThat(admin.getRole()).isEqualTo("admin");
        assertThat(admin.getStatus()).isEqualTo("active");
        assertThat(passwordEncoder.matches(ADMIN_PASS, admin.getPasswordHash())).isTrue();
        Integer adminPerms = jdbcClient.sql("SELECT COUNT(*) FROM admin_permissions WHERE user_id = ?")
                .param(admin.getId())
                .query(Integer.class)
                .single();
        assertThat(adminPerms).isEqualTo(3);

        // Employer 1 + Company + owner membership
        User emp1 = userRepository.findByEmail(DemoAuthDataSeeder.DEMO_EMPLOYER_1_EMAIL).orElseThrow();
        assertThat(emp1.getRole()).isEqualTo("employer");
        assertThat(passwordEncoder.matches(EMPLOYER_PASS, emp1.getPasswordHash())).isTrue();
        List<Company> emp1Companies = companyRepository.findByOwnerId(emp1.getId());
        assertThat(emp1Companies).hasSize(1);
        assertThat(emp1Companies.get(0).getName()).isEqualTo(DemoAuthDataSeeder.DEMO_COMPANY_1_NAME);
        assertThat(companyMemberRepository.findActiveCompanySummariesByUserId(emp1.getId()))
                .hasSize(1)
                .first()
                .satisfies(c -> assertThat(c.getMembershipRole()).isEqualTo("owner"));

        // Employer 2 + separate Company + owner membership
        User emp2 = userRepository.findByEmail(DemoAuthDataSeeder.DEMO_EMPLOYER_2_EMAIL).orElseThrow();
        assertThat(companyMemberRepository.findActiveCompanySummariesByUserId(emp2.getId()))
                .hasSize(1)
                .first()
                .satisfies(c -> assertThat(c.getName()).isEqualTo(DemoAuthDataSeeder.DEMO_COMPANY_2_NAME));

        // Candidates + candidate_profiles
        User cand1 = userRepository.findByEmail(DemoAuthDataSeeder.DEMO_CANDIDATE_1_EMAIL).orElseThrow();
        User cand2 = userRepository.findByEmail(DemoAuthDataSeeder.DEMO_CANDIDATE_2_EMAIL).orElseThrow();
        User suspended = userRepository.findByEmail(DemoAuthDataSeeder.DEMO_SUSPENDED_EMAIL).orElseThrow();

        assertThat(passwordEncoder.matches(CANDIDATE_PASS, cand1.getPasswordHash())).isTrue();
        assertThat(candidateProfileRepository.findByUserId(cand1.getId())).isPresent();
        assertThat(candidateProfileRepository.findByUserId(cand2.getId())).isPresent();
        assertThat(suspended.getStatus()).isEqualTo("suspended");
        assertThat(candidateProfileRepository.findByUserId(suspended.getId())).isPresent();
    }

    @Test
    @DisplayName("5. Re-running seeder is idempotent and NEVER overwrites existing password, status, or mismatched role")
    void seedDemoAccounts_secondRun_idempotentAndNonOverwriting() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("dev");
        DemoAuthDataSeeder seeder = createSeeder(env, validEnabledProps());

        // Pre-insert conflicting role for candidate2 email before seeding
        userRepository.saveAndFlush(User.builder()
                .email(DemoAuthDataSeeder.DEMO_CANDIDATE_2_EMAIL)
                .passwordHash(passwordEncoder.encode("ExistingCustom#2026!"))
                .fullName("Preexisting Employer")
                .role("employer")
                .status("active")
                .isVerified(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());

        DemoAuthDataSeeder.SeedSummary first = seeder.seedDemoAccounts();
        assertThat(first.createdUsers()).isEqualTo(5);
        assertThat(first.conflictSkippedUsers()).isEqualTo(1);

        // Mutate candidate1 password & status (simulate admin suspension & password change)
        User cand1 = userRepository.findByEmail(DemoAuthDataSeeder.DEMO_CANDIDATE_1_EMAIL).orElseThrow();
        String customHash = passwordEncoder.encode("UserRotatedPass#2026!");
        cand1.setPasswordHash(customHash);
        cand1.setStatus("suspended");
        userRepository.saveAndFlush(cand1);

        long userCountBefore = userRepository.count();
        long companyCountBefore = companyRepository.count();
        long profileCountBefore = candidateProfileRepository.count();

        // Run seeder a second time
        DemoAuthDataSeeder.SeedSummary second = seeder.seedDemoAccounts();
        assertThat(second.createdUsers()).isZero();
        assertThat(second.skippedExistingUsers()).isEqualTo(5);
        assertThat(second.conflictSkippedUsers()).isEqualTo(1);

        // Verify zero duplicates and strict non-overwrite
        assertThat(userRepository.count()).isEqualTo(userCountBefore);
        assertThat(companyRepository.count()).isEqualTo(companyCountBefore);
        assertThat(candidateProfileRepository.count()).isEqualTo(profileCountBefore);

        User cand1After = userRepository.findByEmail(DemoAuthDataSeeder.DEMO_CANDIDATE_1_EMAIL).orElseThrow();
        assertThat(cand1After.getPasswordHash()).isEqualTo(customHash);
        assertThat(cand1After.getStatus()).isEqualTo("suspended");

        // Preexisting conflicting email kept its original role & was not given a candidate profile
        User conflictUser = userRepository.findByEmail(DemoAuthDataSeeder.DEMO_CANDIDATE_2_EMAIL).orElseThrow();
        assertThat(conflictUser.getRole()).isEqualTo("employer");
        assertThat(candidateProfileRepository.findByUserId(conflictUser.getId())).isEmpty();
    }
}

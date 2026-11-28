package com.matchajob.security.seed;

import com.matchajob.user.model.CandidateProfile;
import com.matchajob.user.model.Company;
import com.matchajob.user.model.CompanyMember;
import com.matchajob.user.model.User;
import com.matchajob.user.repository.CandidateProfileRepository;
import com.matchajob.user.repository.CompanyMemberRepository;
import com.matchajob.user.repository.CompanyRepository;
import com.matchajob.user.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Opt-in, fail-closed demo account and ownership seeder for local/dev/demo environments.
 *
 * <p>4-layer production safety design:</p>
 * <ol>
 *   <li>Explicit Spring profile allowlist ({@code local}, {@code dev}, {@code demo}) combined with
 *       explicit negation of {@code prod}, {@code production}, {@code staging}, {@code test}.</li>
 *   <li>Explicit opt-in property {@code app.seed.demo-users.enabled=true} ({@code matchIfMissing = false}).</li>
 *   <li>Runtime fail-closed guard checking active profiles and {@code APP_ENV} before any DB access.</li>
 *   <li>Strict password policy validation (no placeholders, no weak passwords, 12..72 UTF-8 bytes)
 *       and strict non-overwrite idempotency for existing accounts.</li>
 * </ol>
 */
@Slf4j
@Component
@Profile({
        "local & !prod & !production & !staging & !test",
        "dev & !prod & !production & !staging & !test",
        "demo & !prod & !production & !staging & !test"
})
@ConditionalOnProperty(
        prefix = "app.seed.demo-users",
        name = "enabled",
        havingValue = "true",
        matchIfMissing = false
)
public class DemoAuthDataSeeder implements ApplicationRunner {

    public static final String DEMO_ADMIN_EMAIL = "demo.admin@matchajob.vn";
    public static final String DEMO_EMPLOYER_1_EMAIL = "demo.employer1@matchajob.vn";
    public static final String DEMO_EMPLOYER_2_EMAIL = "demo.employer2@matchajob.vn";
    public static final String DEMO_CANDIDATE_1_EMAIL = "demo.candidate1@matchajob.vn";
    public static final String DEMO_CANDIDATE_2_EMAIL = "demo.candidate2@matchajob.vn";
    public static final String DEMO_SUSPENDED_EMAIL = "demo.suspended@matchajob.vn";

    public static final String DEMO_COMPANY_1_NAME = "MatchaJob Enterprise Demo";
    public static final String DEMO_COMPANY_1_TAX_CODE = "0319000001";
    public static final String DEMO_COMPANY_2_NAME = "MatchaJob Partner Studio";
    public static final String DEMO_COMPANY_2_TAX_CODE = "0319000002";

    private static final int MIN_DEMO_PASSWORD_LENGTH = 12;
    private static final int MAX_BCRYPT_PASSWORD_BYTES = 72;

    private static final Set<String> APPROVED_PROFILES = Set.of("local", "dev", "demo");
    private static final Set<String> FORBIDDEN_ENVIRONMENTS = Set.of("prod", "production", "staging", "uat", "preprod");
    private static final Set<String> DISALLOWED_COMMON_PASSWORDS = Set.of(
            "password123!", "admin123456!", "changeme123!", "qwerty123456!", "123456789012"
    );
    private static final List<String> DEFAULT_ADMIN_PERMISSIONS = List.of(
            "MANAGE_USERS", "MANAGE_TAXONOMIES", "VIEW_STATS"
    );

    private final Environment environment;
    private final DemoSeedProperties properties;
    private final UserRepository userRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final CompanyRepository companyRepository;
    private final CompanyMemberRepository companyMemberRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcClient jdbcClient;

    public DemoAuthDataSeeder(
            Environment environment,
            DemoSeedProperties properties,
            UserRepository userRepository,
            CandidateProfileRepository candidateProfileRepository,
            CompanyRepository companyRepository,
            CompanyMemberRepository companyMemberRepository,
            PasswordEncoder passwordEncoder,
            JdbcClient jdbcClient
    ) {
        this.environment = environment;
        this.properties = properties;
        this.userRepository = userRepository;
        this.candidateProfileRepository = candidateProfileRepository;
        this.companyRepository = companyRepository;
        this.companyMemberRepository = companyMemberRepository;
        this.passwordEncoder = passwordEncoder;
        this.jdbcClient = jdbcClient;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void run(ApplicationArguments args) {
        validateRuntimeSafety(environment, System.getenv("APP_ENV"));
        SeedSummary summary = seedDemoAccounts();
        log.info("DemoAuthDataSeeder completed: createdUsers={}, skippedExistingUsers={}, conflictSkippedUsers={}",
                summary.createdUsers(), summary.skippedExistingUsers(), summary.conflictSkippedUsers());
    }

    /**
     * Fail-closed runtime guard verifying both Spring active profiles and APP_ENV marker.
     */
    public void validateRuntimeSafety(Environment env, String appEnvMarker) {
        if (!properties.isEnabled()) {
            throw new IllegalStateException("DemoAuthDataSeeder invoked while app.seed.demo-users.enabled is false.");
        }

        List<String> activeProfiles = env != null
                ? Arrays.stream(env.getActiveProfiles())
                        .map(p -> p.trim().toLowerCase(Locale.ROOT))
                        .filter(p -> !p.isEmpty())
                        .toList()
                : List.of();

        for (String profile : activeProfiles) {
            if (FORBIDDEN_ENVIRONMENTS.contains(profile)) {
                throw new IllegalStateException(
                        "FATAL CONFIGURATION: DemoAuthDataSeeder is forbidden under active profile '" + profile + "'."
                );
            }
        }

        if (appEnvMarker != null && !appEnvMarker.isBlank()) {
            String normalizedAppEnv = appEnvMarker.trim().toLowerCase(Locale.ROOT);
            if (FORBIDDEN_ENVIRONMENTS.contains(normalizedAppEnv)) {
                throw new IllegalStateException(
                        "FATAL CONFIGURATION: DemoAuthDataSeeder is forbidden when APP_ENV='" + normalizedAppEnv + "'."
                );
            }
        }

        boolean hasApprovedProfile = activeProfiles.stream().anyMatch(APPROVED_PROFILES::contains);
        if (!hasApprovedProfile) {
            throw new IllegalStateException(
                    "FATAL CONFIGURATION: DemoAuthDataSeeder requires an explicitly approved profile "
                            + APPROVED_PROFILES + " (active: " + activeProfiles + ")."
            );
        }
    }

    /**
     * Validates demo password policy and idempotently seeds demo accounts & ownership records
     * without ever overwriting existing user credentials, roles, or statuses.
     */
    @Transactional(rollbackFor = Exception.class)
    public SeedSummary seedDemoAccounts() {
        validatePassword("admin", properties.getAdminPassword());
        validatePassword("employer", properties.getEmployerPassword());
        validatePassword("candidate", properties.getCandidatePassword());

        int created = 0;
        int skipped = 0;
        int conflicts = 0;

        // 1. Admin account + admin_permissions
        AccountSeedResult adminRes = ensureUser(
                DEMO_ADMIN_EMAIL, "MatchaJob Demo Admin", "admin", "active", true, properties.getAdminPassword());
        if (adminRes.status() == AccountStatus.CREATED) created++;
        else if (adminRes.status() == AccountStatus.EXISTING) skipped++;
        else conflicts++;
        if (adminRes.user() != null) {
            ensureAdminPermissions(adminRes.user().getId());
        }

        // 2. Employer 1 + Enterprise Demo Company + Owner Membership
        AccountSeedResult emp1Res = ensureUser(
                DEMO_EMPLOYER_1_EMAIL, "Demo Employer One", "employer", "active", true, properties.getEmployerPassword());
        if (emp1Res.status() == AccountStatus.CREATED) created++;
        else if (emp1Res.status() == AccountStatus.EXISTING) skipped++;
        else conflicts++;
        if (emp1Res.user() != null) {
            ensureEmployerCompany(
                    emp1Res.user().getId(),
                    DEMO_COMPANY_1_NAME,
                    "MJE",
                    "Information Technology",
                    "50-150",
                    "Ho Chi Minh City",
                    DEMO_COMPANY_1_TAX_CODE
            );
        }

        // 3. Employer 2 + Partner Studio Company + Owner Membership (for cross-employer IDOR verification)
        AccountSeedResult emp2Res = ensureUser(
                DEMO_EMPLOYER_2_EMAIL, "Demo Employer Two", "employer", "active", true, properties.getEmployerPassword());
        if (emp2Res.status() == AccountStatus.CREATED) created++;
        else if (emp2Res.status() == AccountStatus.EXISTING) skipped++;
        else conflicts++;
        if (emp2Res.user() != null) {
            ensureEmployerCompany(
                    emp2Res.user().getId(),
                    DEMO_COMPANY_2_NAME,
                    "MJP",
                    "Product Design",
                    "1-49",
                    "Ha Noi",
                    DEMO_COMPANY_2_TAX_CODE
            );
        }

        // 4. Candidate 1 + CandidateProfile
        AccountSeedResult cand1Res = ensureUser(
                DEMO_CANDIDATE_1_EMAIL, "Demo Candidate One", "candidate", "active", true, properties.getCandidatePassword());
        if (cand1Res.status() == AccountStatus.CREATED) created++;
        else if (cand1Res.status() == AccountStatus.EXISTING) skipped++;
        else conflicts++;
        if (cand1Res.user() != null) {
            ensureCandidateProfile(cand1Res.user().getId(), "Senior Java Backend Developer", (short) 5, "Ho Chi Minh City");
        }

        // 5. Candidate 2 + CandidateProfile (for cross-candidate IDOR verification)
        AccountSeedResult cand2Res = ensureUser(
                DEMO_CANDIDATE_2_EMAIL, "Demo Candidate Two", "candidate", "active", true, properties.getCandidatePassword());
        if (cand2Res.status() == AccountStatus.CREATED) created++;
        else if (cand2Res.status() == AccountStatus.EXISTING) skipped++;
        else conflicts++;
        if (cand2Res.user() != null) {
            ensureCandidateProfile(cand2Res.user().getId(), "Frontend React Engineer", (short) 3, "Ha Noi");
        }

        // 6. Suspended Candidate account (for account-lock regression verification)
        AccountSeedResult suspRes = ensureUser(
                DEMO_SUSPENDED_EMAIL, "Demo Suspended Candidate", "candidate", "suspended", true, properties.getCandidatePassword());
        if (suspRes.status() == AccountStatus.CREATED) created++;
        else if (suspRes.status() == AccountStatus.EXISTING) skipped++;
        else conflicts++;
        if (suspRes.user() != null) {
            ensureCandidateProfile(suspRes.user().getId(), "Suspended Demo Account", (short) 1, "Da Nang");
        }

        return new SeedSummary(created, skipped, conflicts);
    }

    /**
     * Validates password strength and rejects empty/placeholder values without logging the secret.
     */
    public static void validatePassword(String roleLabel, String rawPassword) {
        if (rawPassword == null || rawPassword.isBlank()) {
            throw new IllegalStateException(
                    "FATAL CONFIGURATION: Missing demo seed password for role '" + roleLabel
                            + "'. Provide DEMO_" + roleLabel.toUpperCase(Locale.ROOT) + "_PASSWORD in local .env or secret manager."
            );
        }
        String lower = rawPassword.trim().toLowerCase(Locale.ROOT);
        if (lower.startsWith("replace_with_") || DISALLOWED_COMMON_PASSWORDS.contains(lower)) {
            throw new IllegalStateException(
                    "FATAL CONFIGURATION: Placeholder or weak demo seed password rejected for role '" + roleLabel + "'."
            );
        }
        if (rawPassword.length() < MIN_DEMO_PASSWORD_LENGTH) {
            throw new IllegalStateException(
                    "FATAL CONFIGURATION: Demo seed password for role '" + roleLabel
                            + "' must be at least " + MIN_DEMO_PASSWORD_LENGTH + " characters."
            );
        }
        if (rawPassword.getBytes(StandardCharsets.UTF_8).length > MAX_BCRYPT_PASSWORD_BYTES) {
            throw new IllegalStateException(
                    "FATAL CONFIGURATION: Demo seed password for role '" + roleLabel
                            + "' must not exceed " + MAX_BCRYPT_PASSWORD_BYTES + " UTF-8 bytes."
            );
        }
        boolean hasUpper = rawPassword.chars().anyMatch(Character::isUpperCase);
        boolean hasLower = rawPassword.chars().anyMatch(Character::isLowerCase);
        boolean hasDigit = rawPassword.chars().anyMatch(Character::isDigit);
        boolean hasSpecial = rawPassword.chars().anyMatch(c -> !Character.isLetterOrDigit(c));
        if (!(hasUpper && hasLower && hasDigit && hasSpecial)) {
            throw new IllegalStateException(
                    "FATAL CONFIGURATION: Demo seed password for role '" + roleLabel
                            + "' must include uppercase, lowercase, digit, and special characters."
            );
        }
    }

    private AccountSeedResult ensureUser(
            String email,
            String fullName,
            String expectedRole,
            String initialStatus,
            boolean initialVerified,
            String rawPassword
    ) {
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        Optional<User> existingOpt = userRepository.findByEmail(normalizedEmail);
        if (existingOpt.isPresent()) {
            User existing = existingOpt.get();
            // Strict non-overwrite: never mutate password_hash, role, status, or deleted_at
            if (existing.getDeletedAt() != null || !expectedRole.equalsIgnoreCase(existing.getRole())) {
                log.warn("Demo seed account skipped due to state mismatch [userId={}, expectedRole={}, actualRole={}, deleted={}]",
                        existing.getId(), expectedRole, existing.getRole(), existing.getDeletedAt() != null);
                return new AccountSeedResult(null, AccountStatus.CONFLICT);
            }
            return new AccountSeedResult(existing, AccountStatus.EXISTING);
        }

        Instant now = Instant.now();
        User created = User.builder()
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(rawPassword))
                .fullName(fullName)
                .role(expectedRole)
                .status(initialStatus)
                .isVerified(initialVerified)
                .timezone("Asia/Ho_Chi_Minh")
                .createdAt(now)
                .updatedAt(now)
                .build();
        created = userRepository.saveAndFlush(created);
        log.info("Seeded demo user [userId={}, role={}, status={}]", created.getId(), created.getRole(), created.getStatus());
        return new AccountSeedResult(created, AccountStatus.CREATED);
    }

    private void ensureAdminPermissions(UUID adminUserId) {
        for (String permission : DEFAULT_ADMIN_PERMISSIONS) {
            jdbcClient.sql("""
                    INSERT INTO admin_permissions (user_id, permission)
                    VALUES (?, ?)
                    ON CONFLICT (user_id, permission) DO NOTHING
                    """)
                    .params(adminUserId, permission)
                    .update();
        }
    }

    private void ensureCandidateProfile(UUID userId, String headline, short experienceYears, String location) {
        if (candidateProfileRepository.existsByUserId(userId)) {
            return;
        }
        Instant now = Instant.now();
        CandidateProfile profile = CandidateProfile.builder()
                .userId(userId)
                .headline(headline)
                .experienceYears(experienceYears)
                .location(location)
                .createdAt(now)
                .updatedAt(now)
                .build();
        candidateProfileRepository.saveAndFlush(profile);
    }

    private void ensureEmployerCompany(
            UUID ownerUserId,
            String companyName,
            String shortName,
            String industry,
            String size,
            String location,
            String taxCode
    ) {
        Optional<Company> existingCompany = companyRepository.findByOwnerId(ownerUserId)
                .stream()
                .filter(c -> c.getDeletedAt() == null)
                .filter(c -> taxCode.equalsIgnoreCase(c.getTaxCode()) || companyName.equalsIgnoreCase(c.getName()))
                .findFirst();

        Company company;
        if (existingCompany.isPresent()) {
            company = existingCompany.get();
        } else if (companyRepository.existsByTaxCode(taxCode)) {
            log.warn("Demo company with taxCode={} already exists under another owner; skipping company creation for user {}",
                    taxCode, ownerUserId);
            return;
        } else {
            Instant now = Instant.now();
            company = companyRepository.saveAndFlush(Company.builder()
                    .ownerId(ownerUserId)
                    .name(companyName)
                    .shortName(shortName)
                    .industry(industry)
                    .size(size)
                    .location(location)
                    .taxCode(taxCode)
                    .isVerified(true)
                    .createdAt(now)
                    .updatedAt(now)
                    .build());
        }

        if (!companyMemberRepository.existsByCompanyIdAndUserId(company.getId(), ownerUserId)) {
            companyMemberRepository.saveAndFlush(CompanyMember.builder()
                    .companyId(company.getId())
                    .userId(ownerUserId)
                    .role("owner")
                    .joinedAt(Instant.now())
                    .build());
        }
    }

    private enum AccountStatus {
        CREATED, EXISTING, CONFLICT
    }

    private record AccountSeedResult(User user, AccountStatus status) {
    }

    public record SeedSummary(int createdUsers, int skippedExistingUsers, int conflictSkippedUsers) {
    }
}

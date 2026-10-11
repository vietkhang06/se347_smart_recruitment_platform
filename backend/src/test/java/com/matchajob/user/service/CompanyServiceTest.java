package com.matchajob.user.service;

import com.matchajob.auth.exception.AccountSuspendedException;
import com.matchajob.fixture.CompanyFixture;
import com.matchajob.fixture.UserFixture;
import com.matchajob.user.dto.CompanyResponse;
import com.matchajob.user.dto.CreateCompanyRequest;
import com.matchajob.user.exception.DuplicateTaxCodeException;
import com.matchajob.user.exception.EmployerRoleRequiredException;
import com.matchajob.user.exception.UserNotFoundException;
import com.matchajob.user.model.Company;
import com.matchajob.user.model.CompanyMember;
import com.matchajob.user.model.User;
import com.matchajob.user.repository.CompanyMemberRepository;
import com.matchajob.user.repository.CompanyRepository;
import com.matchajob.user.repository.UserRepository;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.sql.SQLException;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CompanyServiceTest {

    @Mock
    private CompanyRepository companyRepository;

    @Mock
    private CompanyMemberRepository companyMemberRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private CompanyService companyService;

    private UUID userId;
    private User employerUser;
    private CreateCompanyRequest validRequest;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        employerUser = UserFixture.createEmployerUser(userId, "employer@matchajob.com");
        validRequest = CompanyFixture.createValidRequest();
    }

    @Test
    @DisplayName("1. Successfully creates company and owner membership in atomic transaction")
    void createCompany_successful() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(employerUser));
        when(companyRepository.existsByTaxCode("0312345678")).thenReturn(false);

        UUID companyId = UUID.randomUUID();
        when(companyRepository.saveAndFlush(any(Company.class))).thenAnswer(invocation -> {
            Company saved = invocation.getArgument(0);
            saved.setId(companyId);
            saved.setCreatedAt(Instant.now());
            saved.setUpdatedAt(Instant.now());
            return saved;
        });

        CompanyResponse response = companyService.createCompany(userId, validRequest);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(companyId);
        assertThat(response.getOwnerId()).isEqualTo(userId);
        assertThat(response.getName()).isEqualTo("Matcha Solutions Corp");
        assertThat(response.getShortName()).isEqualTo("MatchaCorp");
        assertThat(response.getTaxCode()).isEqualTo("0312345678");
        assertThat(response.getIsVerified()).isFalse();

        // Verify Company entity saved
        ArgumentCaptor<Company> companyCaptor = ArgumentCaptor.forClass(Company.class);
        verify(companyRepository).saveAndFlush(companyCaptor.capture());
        Company capturedCompany = companyCaptor.getValue();
        assertThat(capturedCompany.getOwnerId()).isEqualTo(userId);
        assertThat(capturedCompany.getIsVerified()).isFalse();

        // Verify CompanyMember owner membership saved
        ArgumentCaptor<CompanyMember> memberCaptor = ArgumentCaptor.forClass(CompanyMember.class);
        verify(companyMemberRepository).saveAndFlush(memberCaptor.capture());
        CompanyMember capturedMember = memberCaptor.getValue();
        assertThat(capturedMember.getCompanyId()).isEqualTo(companyId);
        assertThat(capturedMember.getUserId()).isEqualTo(userId);
        assertThat(capturedMember.getRole()).isEqualTo("owner");
    }

    @Test
    @DisplayName("2. Throws UserNotFoundException when userId is null")
    void createCompany_nullUserId_throwsException() {
        assertThatThrownBy(() -> companyService.createCompany(null, validRequest))
                .isInstanceOf(UserNotFoundException.class)
                .hasMessageContaining("User ID cannot be null");

        verifyNoInteractions(companyRepository, companyMemberRepository);
    }

    @Test
    @DisplayName("3. Throws UserNotFoundException when user does not exist in database")
    void createCompany_userNotFound_throwsException() {
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> companyService.createCompany(userId, validRequest))
                .isInstanceOf(UserNotFoundException.class)
                .hasMessageContaining("User not found with id");

        verifyNoInteractions(companyRepository, companyMemberRepository);
    }

    @Test
    @DisplayName("4. Throws UserNotFoundException when user is soft-deleted")
    void createCompany_userDeleted_throwsException() {
        employerUser.setDeletedAt(Instant.now());
        when(userRepository.findById(userId)).thenReturn(Optional.of(employerUser));

        assertThatThrownBy(() -> companyService.createCompany(userId, validRequest))
                .isInstanceOf(UserNotFoundException.class)
                .hasMessageContaining("User has been deleted");

        verifyNoInteractions(companyRepository, companyMemberRepository);
    }

    @Test
    @DisplayName("5. Throws AccountSuspendedException when user status is suspended")
    void createCompany_userSuspended_throwsException() {
        employerUser.setStatus("suspended");
        when(userRepository.findById(userId)).thenReturn(Optional.of(employerUser));

        assertThatThrownBy(() -> companyService.createCompany(userId, validRequest))
                .isInstanceOf(AccountSuspendedException.class)
                .hasMessageContaining("Account has been suspended");

        verifyNoInteractions(companyRepository, companyMemberRepository);
    }

    @Test
    @DisplayName("6. Throws EmployerRoleRequiredException when user role is CANDIDATE")
    void createCompany_candidateRole_throwsException() {
        employerUser.setRole("candidate");
        when(userRepository.findById(userId)).thenReturn(Optional.of(employerUser));

        assertThatThrownBy(() -> companyService.createCompany(userId, validRequest))
                .isInstanceOf(EmployerRoleRequiredException.class)
                .hasMessageContaining("Only users with role EMPLOYER are permitted");

        verifyNoInteractions(companyRepository, companyMemberRepository);
    }

    @Test
    @DisplayName("7. Throws EmployerRoleRequiredException when user role is ADMIN")
    void createCompany_adminRole_throwsException() {
        employerUser.setRole("admin");
        when(userRepository.findById(userId)).thenReturn(Optional.of(employerUser));

        assertThatThrownBy(() -> companyService.createCompany(userId, validRequest))
                .isInstanceOf(EmployerRoleRequiredException.class)
                .hasMessageContaining("Only users with role EMPLOYER are permitted");

        verifyNoInteractions(companyRepository, companyMemberRepository);
    }

    @Test
    @DisplayName("8. Throws DuplicateTaxCodeException when tax code already exists (pre-check)")
    void createCompany_duplicateTaxCodePreCheck_throwsException() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(employerUser));
        when(companyRepository.existsByTaxCode("0312345678")).thenReturn(true);

        assertThatThrownBy(() -> companyService.createCompany(userId, validRequest))
                .isInstanceOf(DuplicateTaxCodeException.class)
                .hasMessageContaining("Company with tax code 0312345678 already exists");

        verify(companyRepository, never()).saveAndFlush(any());
        verifyNoInteractions(companyMemberRepository);
    }

    @Test
    @DisplayName("9. Throws DuplicateTaxCodeException when database catches unique tax_code race condition")
    void createCompany_duplicateTaxCodeRaceCondition_throwsException() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(employerUser));
        when(companyRepository.existsByTaxCode("0312345678")).thenReturn(false);

        ConstraintViolationException cve = new ConstraintViolationException(
                "duplicate key value",
                new SQLException("duplicate key", "23505"),
                "uq_companies_tax_code"
        );
        DataIntegrityViolationException dbException = new DataIntegrityViolationException("error", cve);
        when(companyRepository.saveAndFlush(any(Company.class))).thenThrow(dbException);

        assertThatThrownBy(() -> companyService.createCompany(userId, validRequest))
                .isInstanceOf(DuplicateTaxCodeException.class)
                .hasMessageContaining("already exists");

        verifyNoInteractions(companyMemberRepository);
    }

    @Test
    @DisplayName("10. Throws original exception when membership creation fails, triggering rollback")
    void createCompany_membershipCreationFails_throwsException() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(employerUser));
        when(companyRepository.existsByTaxCode("0312345678")).thenReturn(false);

        UUID companyId = UUID.randomUUID();
        when(companyRepository.saveAndFlush(any(Company.class))).thenAnswer(invocation -> {
            Company saved = invocation.getArgument(0);
            saved.setId(companyId);
            return saved;
        });

        when(companyMemberRepository.saveAndFlush(any(CompanyMember.class)))
                .thenThrow(new RuntimeException("Database error saving membership"));

        assertThatThrownBy(() -> companyService.createCompany(userId, validRequest))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Database error saving membership");

        verify(companyRepository).saveAndFlush(any(Company.class));
        verify(companyMemberRepository).saveAndFlush(any(CompanyMember.class));
    }

    @Test
    @DisplayName("11. Successfully creates company without tax code when tax code is null or empty")
    void createCompany_withoutTaxCode_successful() {
        validRequest.setTaxCode("   ");
        when(userRepository.findById(userId)).thenReturn(Optional.of(employerUser));

        UUID companyId = UUID.randomUUID();
        when(companyRepository.saveAndFlush(any(Company.class))).thenAnswer(invocation -> {
            Company saved = invocation.getArgument(0);
            saved.setId(companyId);
            return saved;
        });

        CompanyResponse response = companyService.createCompany(userId, validRequest);

        assertThat(response).isNotNull();
        assertThat(response.getTaxCode()).isNull();

        verify(companyRepository, never()).existsByTaxCode(any());
        verify(companyMemberRepository).saveAndFlush(any());
    }

    @Test
    @DisplayName("12. Two companies both sending empty or whitespace tax_code normalize to NULL and do not trigger 409")
    void createCompany_twoCompaniesWithBlankTaxCode_normalizeToNullWithoutConflict() {
        UUID user2Id = UUID.randomUUID();
        User employer2 = UserFixture.createEmployerUser(user2Id, "employer2@matchajob.com");

        when(userRepository.findById(userId)).thenReturn(Optional.of(employerUser));
        when(userRepository.findById(user2Id)).thenReturn(Optional.of(employer2));

        when(companyRepository.saveAndFlush(any(Company.class))).thenAnswer(invocation -> {
            Company c = invocation.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });

        CreateCompanyRequest request1 = CompanyFixture.createValidRequest();
        request1.setTaxCode("");

        CreateCompanyRequest request2 = CompanyFixture.createValidRequest();
        request2.setName("Second Company LLC");
        request2.setTaxCode("   ");

        CompanyResponse resp1 = companyService.createCompany(userId, request1);
        CompanyResponse resp2 = companyService.createCompany(user2Id, request2);

        assertThat(resp1.getTaxCode()).isNull();
        assertThat(resp2.getTaxCode()).isNull();

        ArgumentCaptor<Company> companyCaptor = ArgumentCaptor.forClass(Company.class);
        verify(companyRepository, times(2)).saveAndFlush(companyCaptor.capture());
        assertThat(companyCaptor.getAllValues()).allMatch(c -> c.getTaxCode() == null);
        verify(companyRepository, never()).existsByTaxCode(any());
    }

    @Test
    @DisplayName("13. Other database constraint violation rethrows original DataIntegrityViolationException")
    void createCompany_otherConstraintViolation_rethrowsOriginalException() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(employerUser));
        when(companyRepository.existsByTaxCode("0312345678")).thenReturn(false);

        ConstraintViolationException cve = new ConstraintViolationException(
                "duplicate key value",
                new SQLException("duplicate key", "23505"),
                "uq_companies_name"
        );
        DataIntegrityViolationException dbException = new DataIntegrityViolationException("error", cve);
        when(companyRepository.saveAndFlush(any(Company.class))).thenThrow(dbException);

        assertThatThrownBy(() -> companyService.createCompany(userId, validRequest))
                .isInstanceOf(DataIntegrityViolationException.class)
                .isNotInstanceOf(DuplicateTaxCodeException.class);

        verifyNoInteractions(companyMemberRepository);
    }
}

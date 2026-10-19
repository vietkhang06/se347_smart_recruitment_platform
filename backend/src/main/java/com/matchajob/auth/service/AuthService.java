package com.matchajob.auth.service;

import com.matchajob.auth.dto.*;
import com.matchajob.auth.exception.*;
import com.matchajob.security.JwtTokenProvider;
import com.matchajob.user.model.CandidateProfile;
import com.matchajob.user.model.User;
import com.matchajob.user.repository.CandidateProfileRepository;
import com.matchajob.user.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Locale;
import java.util.regex.Pattern;

@Slf4j
@Service
public class AuthService {

    private static final int MAX_PASSWORD_BYTES = 72;
    private static final int MIN_PASSWORD_LENGTH = 8;
    private static final int MAX_FULL_NAME_LENGTH = 150;
    private static final int MAX_EMAIL_LENGTH = 255;
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    private final UserRepository userRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final boolean requireEmailVerification;

    public AuthService(
            UserRepository userRepository,
            CandidateProfileRepository candidateProfileRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider jwtTokenProvider,
            @Value("${app.auth.require-email-verification:true}") boolean requireEmailVerification
    ) {
        this.userRepository = userRepository;
        this.candidateProfileRepository = candidateProfileRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.requireEmailVerification = requireEmailVerification;
    }

    @Transactional(rollbackFor = Exception.class)
    public RegisterResponse register(RegisterRequest request) {
        if (request == null) {
            throw new AuthValidationException("Request body cannot be null");
        }

        // Validate and normalize email
        String rawEmail = request.getEmail();
        if (rawEmail == null || rawEmail.isBlank()) {
            throw new AuthValidationException("Email is required");
        }
        String normalizedEmail = normalizeEmail(rawEmail);
        if (!EMAIL_PATTERN.matcher(normalizedEmail).matches()) {
            throw new AuthValidationException("Email must be a valid email address");
        }
        if (normalizedEmail.length() > MAX_EMAIL_LENGTH) {
            throw new AuthValidationException("Email must not exceed 255 characters");
        }

        // Validate password (BCrypt 72 byte limit)
        String password = request.getPassword();
        if (password == null || password.length() < MIN_PASSWORD_LENGTH) {
            throw new AuthValidationException("Password must be at least 8 characters");
        }
        if (password.getBytes(StandardCharsets.UTF_8).length > MAX_PASSWORD_BYTES) {
            throw new AuthValidationException("Password must not exceed 72 bytes UTF-8");
        }

        // Validate role (strictly CANDIDATE or EMPLOYER for public registration)
        String rawRole = request.getRole();
        if (rawRole == null || rawRole.isBlank()) {
            throw new InvalidRegistrationRoleException("Role is required");
        }
        String roleUpper = rawRole.trim().toUpperCase(Locale.ROOT);
        if (!"CANDIDATE".equals(roleUpper) && !"EMPLOYER".equals(roleUpper)) {
            throw new InvalidRegistrationRoleException("Only CANDIDATE and EMPLOYER roles are permitted for public registration");
        }

        // Pre-check duplicate email
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new EmailAlreadyExistsException("Email is already registered");
        }

        // Determine initial account status based on verification configuration
        String status;
        boolean isVerified;
        if (requireEmailVerification) {
            status = "pending_verification";
            isVerified = false;
        } else {
            status = "active";
            isVerified = true;
        }

        String fullName = deriveFullName(normalizedEmail);
        String dbRole = roleUpper.toLowerCase(Locale.ROOT);

        User user = User.builder()
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(password))
                .fullName(fullName)
                .role(dbRole)
                .status(status)
                .isVerified(isVerified)
                .timezone("Asia/Ho_Chi_Minh")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        try {
            user = userRepository.saveAndFlush(user);

            // Atomically create CandidateProfile for candidate role
            if ("CANDIDATE".equals(roleUpper)) {
                CandidateProfile profile = CandidateProfile.builder()
                        .userId(user.getId())
                        .createdAt(Instant.now())
                        .updatedAt(Instant.now())
                        .build();
                candidateProfileRepository.saveAndFlush(profile);
            }
        } catch (DataIntegrityViolationException ex) {
            if (isEmailUniqueViolation(ex)) {
                throw new EmailAlreadyExistsException("Email is already registered");
            }
            throw ex;
        }

        log.info("Registered new user with id: {}, role: {}, status: {}", user.getId(), roleUpper, user.getStatus());

        return RegisterResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(roleUpper)
                .status(user.getStatus())
                .isVerified(user.getIsVerified())
                .message("User registered successfully")
                .build();
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        if (request == null || request.getEmail() == null || request.getEmail().isBlank()
                || request.getPassword() == null || request.getPassword().isBlank()) {
            throw new InvalidCredentialsException("Invalid email or password");
        }

        String normalizedEmail = normalizeEmail(request.getEmail());
        User user = userRepository.findByEmail(normalizedEmail).orElse(null);

        // Fail with identical generic message if user not found, soft-deleted, or password incorrect
        if (user == null || user.getDeletedAt() != null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new InvalidCredentialsException("Invalid email or password");
        }

        // Suspended accounts are always blocked
        if ("suspended".equalsIgnoreCase(user.getStatus())) {
            throw new AccountSuspendedException("Account has been suspended");
        }

        // Verification requirement check
        if (requireEmailVerification && Boolean.FALSE.equals(user.getIsVerified())) {
            throw new AccountNotActivatedException("Account is pending email verification");
        }

        // Update last_login_at on successful authentication
        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        String roleUpper = user.getRole() != null ? user.getRole().toUpperCase(Locale.ROOT) : "CANDIDATE";
        String token = jwtTokenProvider.generateToken(user.getId());

        log.info("User {} successfully logged in with role: {}", user.getId(), roleUpper);

        return LoginResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .expiresIn(jwtTokenProvider.getExpirationSeconds())
                .user(UserSummaryDto.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .fullName(user.getFullName())
                        .role(roleUpper)
                        .build())
                .build();
    }

    public static String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    public static String deriveFullName(String email) {
        int atIndex = email.indexOf('@');
        String localPart = atIndex > 0 ? email.substring(0, atIndex) : email;
        if (localPart.length() > MAX_FULL_NAME_LENGTH) {
            return localPart.substring(0, MAX_FULL_NAME_LENGTH);
        }
        return localPart;
    }

    private boolean isEmailUniqueViolation(DataIntegrityViolationException ex) {
        String msg = ex.getMessage() != null ? ex.getMessage() : "";
        Throwable rootCause = ex.getRootCause();
        String rootMsg = rootCause != null && rootCause.getMessage() != null ? rootCause.getMessage() : "";
        String combined = (msg + " " + rootMsg).toLowerCase(Locale.ROOT);
        return combined.contains("uq_users_email")
                || combined.contains("users_email_key")
                || (combined.contains("users") && combined.contains("email") && combined.contains("unique"));
    }
}

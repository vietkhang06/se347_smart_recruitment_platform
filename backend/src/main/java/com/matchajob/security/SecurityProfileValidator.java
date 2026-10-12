package com.matchajob.security;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;
import java.util.Set;

@Slf4j
@Component
public class SecurityProfileValidator {

    public static final String DEFAULT_DEV_JWT_SECRET = "dGhpc19pc19hX3Zlcnlfc2VjdXJlX2p3dF9zZWNyZXRfa2V5X2Zvcl9tYXRjaGFqb2JfZGV2XzIwMjY=";

    private static final Set<String> ALLOWED_ENV_VALUES = Set.of(
            "dev", "development", "prod", "production"
    );

    private final Environment environment;
    private final boolean requireEmailVerification;
    private final String appEnvMarker;
    private final String jwtSecret;

    @Autowired
    public SecurityProfileValidator(
            Environment environment,
            @Value("${app.auth.require-email-verification:true}") boolean requireEmailVerification
    ) {
        this(
                environment,
                requireEmailVerification,
                System.getenv("APP_ENV"),
                environment != null ? environment.getProperty("security.jwt.secret") : null
        );
    }

    // Constructor for testing with full parameters
    public SecurityProfileValidator(
            Environment environment,
            boolean requireEmailVerification,
            String appEnvMarker,
            String jwtSecret
    ) {
        this.environment = environment;
        this.requireEmailVerification = requireEmailVerification;
        this.appEnvMarker = appEnvMarker;
        this.jwtSecret = jwtSecret;
    }

    // Overload for backward compatibility in tests (defaults to valid non-dev test secret)
    public SecurityProfileValidator(
            Environment environment,
            boolean requireEmailVerification,
            String appEnvMarker
    ) {
        this(environment, requireEmailVerification, appEnvMarker, "test_custom_secure_signing_key_for_validator_2026");
    }

    @PostConstruct
    public void validate() {
        List<String> activeProfiles = Arrays.asList(
                environment != null ? environment.getActiveProfiles() : new String[0]
        );
        boolean isSpringProfileProd = activeProfiles.contains("prod");
        boolean isSpringProfileDev = activeProfiles.contains("dev");

        // 1. If APP_ENV is explicitly provided, validate its value
        if (appEnvMarker != null && !appEnvMarker.isBlank()) {
            String normalizedEnv = appEnvMarker.trim().toLowerCase();
            if (!ALLOWED_ENV_VALUES.contains(normalizedEnv)) {
                throw new IllegalStateException(
                        "FATAL: Invalid APP_ENV marker: '" + appEnvMarker +
                        "'. Accepted values are: 'dev', 'development', 'prod', 'production'."
                );
            }

            boolean isMarkerProd = normalizedEnv.equals("prod") || normalizedEnv.equals("production");
            boolean isMarkerDev = normalizedEnv.equals("dev") || normalizedEnv.equals("development");

            if (isMarkerProd) {
                // Rule 1: APP_ENV=prod combined with Spring profile dev must fail fast
                if (isSpringProfileDev || !isSpringProfileProd) {
                    throw new IllegalStateException(
                            "FATAL CONFIGURATION: APP_ENV is production but Spring active profile is not 'prod' (active: " +
                            activeProfiles + ")."
                    );
                }

                // Rule 2: APP_ENV=prod combined with require-email-verification=false must fail fast
                if (!requireEmailVerification) {
                    throw new IllegalStateException(
                            "FATAL CONFIGURATION: Email verification (app.auth.require-email-verification) cannot be disabled in production!"
                    );
                }

                // Rule 3: APP_ENV=prod requires non-blank JWT secret that is NOT the default dev secret
                validateProductionJwtSecret();
            }

            if (isMarkerDev) {
                // Rule: APP_ENV=dev combined with Spring profile prod must fail fast
                if (isSpringProfileProd) {
                    throw new IllegalStateException(
                            "FATAL CONFIGURATION: APP_ENV is dev but Spring active profile is 'prod'."
                    );
                }
            }
        } else {
            // 2. If APP_ENV is NOT set:
            // Rule: If Spring profile is prod, missing APP_ENV marker must fail fast
            if (isSpringProfileProd) {
                throw new IllegalStateException(
                        "FATAL CONFIGURATION: Production Spring profile active but required marker APP_ENV=production is missing."
                );
            }
        }

        // Additional safeguard: If active profile is prod
        if (isSpringProfileProd) {
            if (!requireEmailVerification) {
                throw new IllegalStateException(
                        "FATAL CONFIGURATION: Production profile active with app.auth.require-email-verification=false!"
                );
            }
            validateProductionJwtSecret();
        }
    }

    private void validateProductionJwtSecret() {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException(
                    "FATAL CONFIGURATION: JWT_SECRET must be explicitly configured in production!"
            );
        }
        if (DEFAULT_DEV_JWT_SECRET.equals(jwtSecret.trim())) {
            throw new IllegalStateException(
                    "FATAL CONFIGURATION: Default development JWT secret cannot be used in production!"
            );
        }
    }
}

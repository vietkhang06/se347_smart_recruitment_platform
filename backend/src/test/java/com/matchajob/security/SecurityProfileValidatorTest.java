package com.matchajob.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SecurityProfileValidatorTest {

    @Test
    @DisplayName("1. APP_ENV=prod with Spring profile dev fails fast")
    void validate_prodMarkerWithDevProfile_failsFast() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("dev");

        SecurityProfileValidator validator = new SecurityProfileValidator(env, true, "prod");

        assertThatThrownBy(validator::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("APP_ENV is production but Spring active profile is not 'prod'");
    }

    @Test
    @DisplayName("2. APP_ENV=prod with requireEmailVerification=false fails fast")
    void validate_prodMarkerWithDisabledEmailVerification_failsFast() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");

        SecurityProfileValidator validator = new SecurityProfileValidator(env, false, "prod");

        assertThatThrownBy(validator::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Email verification (app.auth.require-email-verification) cannot be disabled in production");
    }

    @Test
    @DisplayName("3. APP_ENV=production with Spring profile prod and requireEmailVerification=true passes")
    void validate_validProductionConfig_passes() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");

        SecurityProfileValidator validator = new SecurityProfileValidator(env, true, "production");

        assertThatCode(validator::validate).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("4. APP_ENV=dev with Spring profile dev passes")
    void validate_validDevelopmentConfig_passes() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("dev");

        SecurityProfileValidator validator = new SecurityProfileValidator(env, false, "dev");

        assertThatCode(validator::validate).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("5. APP_ENV=dev with Spring profile prod fails fast")
    void validate_devMarkerWithProdProfile_failsFast() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");

        SecurityProfileValidator validator = new SecurityProfileValidator(env, true, "development");

        assertThatThrownBy(validator::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("APP_ENV is dev but Spring active profile is 'prod'");
    }

    @Test
    @DisplayName("6. Unknown APP_ENV marker fails fast")
    void validate_unknownMarker_failsFast() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("dev");

        SecurityProfileValidator validator = new SecurityProfileValidator(env, false, "staging_unknown");

        assertThatThrownBy(validator::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Invalid APP_ENV marker");
    }

    @Test
    @DisplayName("7. Missing APP_ENV marker with Spring profile prod fails fast")
    void validate_missingMarkerWithProdProfile_failsFast() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");

        SecurityProfileValidator validator = new SecurityProfileValidator(env, true, null);

        assertThatThrownBy(validator::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Production Spring profile active but required marker APP_ENV=production is missing");
    }

    @Test
    @DisplayName("8. Missing APP_ENV marker with Spring profile dev passes for local developer ergonomics")
    void validate_missingMarkerWithDevProfile_passes() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("dev");

        SecurityProfileValidator validator = new SecurityProfileValidator(env, false, null);

        assertThatCode(validator::validate).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("9. APP_ENV=prod with default development JWT secret fails fast")
    void validate_prodMarkerWithDefaultDevSecret_failsFast() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");

        SecurityProfileValidator validator = new SecurityProfileValidator(
                env, true, "prod", SecurityProfileValidator.DEFAULT_DEV_JWT_SECRET
        );

        assertThatThrownBy(validator::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Default development JWT secret cannot be used in production");
    }

    @Test
    @DisplayName("10. APP_ENV=prod with blank or null JWT secret fails fast")
    void validate_prodMarkerWithBlankJwtSecret_failsFast() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");

        SecurityProfileValidator validatorNull = new SecurityProfileValidator(
                env, true, "prod", null
        );
        assertThatThrownBy(validatorNull::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JWT_SECRET must be explicitly configured in production");

        SecurityProfileValidator validatorBlank = new SecurityProfileValidator(
                env, true, "prod", "   "
        );
        assertThatThrownBy(validatorBlank::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JWT_SECRET must be explicitly configured in production");
    }

    @Test
    @DisplayName("11. APP_ENV=prod with custom secure JWT secret passes")
    void validate_prodMarkerWithCustomJwtSecret_passes() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");

        SecurityProfileValidator validator = new SecurityProfileValidator(
                env, true, "prod", "my_super_secret_production_key_not_matching_dev_default_2026"
        );

        assertThatCode(validator::validate).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("12. APP_ENV=dev with default dev JWT secret passes for developer ergonomics")
    void validate_devMarkerWithDefaultDevSecret_passes() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("dev");

        SecurityProfileValidator validator = new SecurityProfileValidator(
                env, false, "dev", SecurityProfileValidator.DEFAULT_DEV_JWT_SECRET
        );

        assertThatCode(validator::validate).doesNotThrowAnyException();
    }
}

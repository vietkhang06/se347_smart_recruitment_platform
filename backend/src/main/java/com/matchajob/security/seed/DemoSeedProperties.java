package com.matchajob.security.seed;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration properties for opt-in demo authentication and role seeding.
 * Disabled by default across all profiles; passwords must be supplied via
 * environment/secret management and are excluded from {@code toString()}.
 */
@Getter
@Setter
@ToString
@Component
@ConfigurationProperties(prefix = "app.seed.demo-users")
public class DemoSeedProperties {

    private boolean enabled = false;

    @ToString.Exclude
    private String adminPassword;

    @ToString.Exclude
    private String employerPassword;

    @ToString.Exclude
    private String candidatePassword;
}

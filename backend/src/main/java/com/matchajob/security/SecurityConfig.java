package com.matchajob.security;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final boolean springdocEnabled;
    private final List<String> allowedOrigins;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter,
            @Value("${springdoc.api-docs.enabled:false}") boolean springdocEnabled,
            @Value("${app.cors.allowed-origins:http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000}") String allowedOriginsStr
    ) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.springdocEnabled = springdocEnabled;
        this.allowedOrigins = Arrays.stream(allowedOriginsStr.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // CSRF is disabled because this is a stateless REST API using Bearer JWT tokens in Authorization headers
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> {
                    // Preflight CORS OPTIONS requests from frontend origins
                    auth.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll();

                    // Public authentication endpoints for Phase 3
                    auth.requestMatchers(HttpMethod.POST, "/v1/auth/register", "/v1/auth/login").permitAll();

                    // Public container health probes (liveness, readiness, health check)
                    auth.requestMatchers(HttpMethod.GET, "/actuator/health", "/actuator/health/**").permitAll();

                    // Conditionally permit Swagger UI / OpenAPI only when springdoc is enabled (dev/test)
                    if (springdocEnabled) {
                        auth.requestMatchers("/v3/api-docs", "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll();
                    }

                    // Public Recruitment endpoints (evidence: guest job search and categories/skills in frontend)
                    auth.requestMatchers(HttpMethod.GET, "/v1/jobs").permitAll();
                    auth.requestMatchers(HttpMethod.GET, "/v1/categories", "/v1/categories/**").permitAll();
                    auth.requestMatchers(HttpMethod.GET, "/v1/skills", "/v1/skills/**").permitAll();
                    auth.requestMatchers(HttpMethod.GET, "/api/v1/recruitment/taxonomies", "/api/v1/recruitment/taxonomies/**").permitAll();
                    auth.requestMatchers(HttpMethod.GET, "/v1/companies/{id:[0-9a-fA-F\\-]+}").permitAll();

                    // Role-protected endpoints: Employer
                    auth.requestMatchers(HttpMethod.GET, "/v1/companies/me").hasRole("EMPLOYER");
                    auth.requestMatchers(HttpMethod.POST, "/v1/companies", "/v1/companies/**").hasRole("EMPLOYER");
                    auth.requestMatchers(HttpMethod.PUT, "/v1/companies", "/v1/companies/**").hasRole("EMPLOYER");
                    auth.requestMatchers(HttpMethod.PATCH, "/v1/companies", "/v1/companies/**").hasRole("EMPLOYER");
                    auth.requestMatchers("/v1/employer/**").hasRole("EMPLOYER");
                    auth.requestMatchers(HttpMethod.PATCH, "/v1/applications/*/stage", "/v1/applications/{id}/stage").hasRole("EMPLOYER");
                    auth.requestMatchers(HttpMethod.GET, "/v1/jobs/*/applications", "/v1/jobs/*/applications/**").hasRole("EMPLOYER");
                    auth.requestMatchers(HttpMethod.GET, "/v1/jobs/*/applications/ranking").hasRole("EMPLOYER");
                    auth.requestMatchers("/v1/interviews", "/v1/interviews/**").authenticated();

                    // Role-protected endpoints: Admin (must precede anyRequest)
                    auth.requestMatchers("/v1/admin", "/v1/admin/**").hasRole("ADMIN");

                    // Role-protected endpoints: Candidate
                    auth.requestMatchers("/v1/candidates/profile", "/v1/candidates/profile/**").hasRole("CANDIDATE");
                    auth.requestMatchers(HttpMethod.POST, "/v1/applications").hasRole("CANDIDATE");
                    auth.requestMatchers(HttpMethod.POST, "/v1/candidates/*/cv").hasRole("CANDIDATE");
                    auth.requestMatchers(HttpMethod.GET, "/v1/candidates/*/cv").hasRole("CANDIDATE");
                    auth.requestMatchers(HttpMethod.GET, "/v1/candidates/*/cv/active").hasRole("CANDIDATE");
                    auth.requestMatchers(HttpMethod.PUT, "/v1/candidates/*/cv/*/active").hasRole("CANDIDATE");

                    // All other endpoints require authentication by default (deny-by-default)
                    auth.anyRequest().authenticated();
                })
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.setContentType("application/problem+json");
                            response.getWriter().write(
                                    "{\"type\":\"https://matchajob.com/errors/unauthorized\"," +
                                    "\"title\":\"Unauthorized\"," +
                                    "\"status\":401," +
                                    "\"detail\":\"Full authentication is required to access this resource\"}"
                            );
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.setContentType("application/problem+json");
                            response.getWriter().write(
                                    "{\"type\":\"https://matchajob.com/errors/forbidden\"," +
                                    "\"title\":\"Forbidden\"," +
                                    "\"status\":403," +
                                    "\"detail\":\"Access is denied: insufficient permissions or invalid role\"," +
                                    "\"code\":\"FORBIDDEN\"}"
                            );
                        })
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(allowedOrigins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of(
                "Authorization",
                "Content-Type",
                "Accept",
                "X-Candidate-Id",
                "X-User-Id",
                "Origin",
                "X-Requested-With"
        ));
        configuration.setExposedHeaders(List.of("Authorization", "Content-Type", "Content-Disposition"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }
}

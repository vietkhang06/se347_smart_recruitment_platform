package com.matchajob.security;

import com.matchajob.config.OpenApiConfig;
import com.matchajob.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springdoc.core.configuration.SpringDocConfiguration;
import org.springdoc.core.configuration.SpringDocUIConfiguration;
import org.springdoc.core.properties.SpringDocConfigProperties;
import org.springdoc.core.properties.SwaggerUiConfigProperties;
import org.springdoc.core.properties.SwaggerUiOAuthProperties;
import org.springdoc.webmvc.core.configuration.SpringDocWebMvcConfiguration;
import org.springdoc.webmvc.ui.SwaggerConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.jackson.JacksonAutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest
@ActiveProfiles("prod")
@TestPropertySource(properties = {
        "JWT_SECRET=" + SecurityProfileValidator.DEFAULT_DEV_JWT_SECRET
})
@ContextConfiguration(classes = SwaggerProdProfileAccessTest.TestConfig.class)
class SwaggerProdProfileAccessTest {

    @Configuration
    @EnableWebMvc
    @EnableConfigurationProperties({
            SpringDocConfigProperties.class,
            SwaggerUiConfigProperties.class,
            SwaggerUiOAuthProperties.class
    })
    @Import({
            SecurityConfig.class,
            JwtAuthenticationFilter.class,
            JwtTokenProvider.class,
            OpenApiConfig.class,
            SpringDocConfiguration.class,
            SpringDocWebMvcConfiguration.class,
            SwaggerConfig.class,
            SpringDocUIConfiguration.class,
            JacksonAutoConfiguration.class
    })
    static class TestConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserRepository userRepository;

    @Test
    @DisplayName("Prod profile: anonymous access to /v3/api-docs is rejected with 401 Unauthorized")
    void prodProfile_apiDocsBlockedAnonymously_returns401() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.title").value("Unauthorized"))
                .andExpect(jsonPath("$.detail").value("Full authentication is required to access this resource"));
    }

    @Test
    @DisplayName("Prod profile: anonymous access to /swagger-ui/index.html is rejected with 401 Unauthorized")
    void prodProfile_swaggerUiBlockedAnonymously_returns401() throws Exception {
        mockMvc.perform(get("/swagger-ui/index.html"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.title").value("Unauthorized"))
                .andExpect(jsonPath("$.detail").value("Full authentication is required to access this resource"));
    }
}

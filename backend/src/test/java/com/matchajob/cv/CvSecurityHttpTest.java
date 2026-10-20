package com.matchajob.cv;

import com.matchajob.common.exception.GlobalExceptionHandler;
import com.matchajob.cv.controller.CvController;
import com.matchajob.cv.model.CvVersion;
import com.matchajob.cv.repository.CvVersionRepository;
import com.matchajob.cv.service.*;
import com.matchajob.security.*;
import com.matchajob.user.model.User;
import com.matchajob.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;
import java.util.UUID;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(properties = "security.jwt.secret=" + SecurityProfileValidator.DEFAULT_DEV_JWT_SECRET)
@ContextConfiguration(classes = CvSecurityHttpTest.Config.class)
class CvSecurityHttpTest {
    @org.springframework.context.annotation.Configuration
    @org.springframework.web.servlet.config.annotation.EnableWebMvc
    @Import({CvController.class, GlobalExceptionHandler.class, SecurityConfig.class,
            JwtAuthenticationFilter.class, JwtTokenProvider.class})
    static class Config { }

    @Autowired MockMvc mvc;
    @Autowired JwtTokenProvider jwt;
    @MockBean UserRepository users;
    @MockBean CvStorageService storage;
    @MockBean CvRegistrationService registrations;
    @MockBean CvVersionRepository cvs;
    @MockBean CvProcessingOrchestrator worker;
    @MockBean ResourceOwnershipService ownership;
    @MockBean CvAccessAuditService audit;

    @Test
    void anonymousMetadataCannotReachController() throws Exception {
        mvc.perform(get("/v1/candidates/{candidate}/cv/{cv}", UUID.randomUUID(), UUID.randomUUID()))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(cvs, ownership);
    }

    @Test
    void adminMayReadSpecificMetadataWithAudit() throws Exception {
        UUID adminId = UUID.randomUUID(), candidateId = UUID.randomUUID(), cvId = UUID.randomUUID();
        String token = token(adminId, "admin");
        when(cvs.findByIdAndCandidateId(cvId, candidateId)).thenReturn(Optional.of(CvVersion.builder()
                .id(cvId).candidateId(candidateId).fileName("synthetic.pdf").build()));
        mvc.perform(get("/v1/candidates/{candidate}/cv/{cv}", candidateId, cvId).header("Authorization", token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.file_path").doesNotExist());
        verify(audit).recordAdminRead(adminId, cvId, "VIEW_CV_METADATA");
    }

    private String token(UUID id, String role) {
        when(users.findById(id)).thenReturn(Optional.of(User.builder().id(id).role(role)
                .email("synthetic@example.invalid").status("active").isVerified(true).build()));
        return "Bearer " + jwt.generateToken(id, "synthetic@example.invalid", role);
    }
}

package com.matchajob.matching.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.matchajob.matching.service.MatchingResultMapper;
import com.matchajob.matching.service.MatchingService;
import com.matchajob.security.ResourceOwnershipService;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class MatchControllerTest {

    @Test
    void rejectsUnauthenticatedMatchingReadBeforeCallingService() {
        MatchingService matchingService = mock(MatchingService.class);
        ResourceOwnershipService ownershipService = mock(ResourceOwnershipService.class);
        MatchController controller = new MatchController(
                matchingService,
                new MatchingResultMapper(new ObjectMapper()),
                ownershipService);

        assertThatThrownBy(() -> controller.getMatchResult(UUID.randomUUID(), null))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(matchingService, ownershipService);
    }
}

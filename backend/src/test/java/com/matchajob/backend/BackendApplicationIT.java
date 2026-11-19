package com.matchajob.backend;

import com.matchajob.MatchaJobApplication;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(classes = MatchaJobApplication.class)
@ActiveProfiles("test")
class BackendApplicationIT {

    @Test
    void contextLoads() {
    }
}

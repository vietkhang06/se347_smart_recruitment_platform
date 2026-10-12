package com.matchajob;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@ComponentScan(
    basePackages = "com.matchajob",
    excludeFilters = {
        @ComponentScan.Filter(
            type = FilterType.REGEX,
            pattern = "com\\.matchajob\\.api\\..*"
        )
    }
)
@EntityScan(basePackages = {
    "com.matchajob.client",
    "com.matchajob.common",
    "com.matchajob.config",
    "com.matchajob.health",
    "com.matchajob.cv",
    "com.matchajob.processing",
    "com.matchajob.matching",
    "com.matchajob.application",
    "com.matchajob.user"
})
@EnableJpaRepositories(basePackages = {
    "com.matchajob.cv",
    "com.matchajob.processing",
    "com.matchajob.matching",
    "com.matchajob.application",
    "com.matchajob.user"
})
public class MatchaJobApplication {

    public static void main(String[] args) {
        SpringApplication.run(MatchaJobApplication.class, args);
    }
}

package com.matchajob;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;

@SpringBootApplication
@ComponentScan(
    basePackages = "com.matchajob",
    excludeFilters = {
        @ComponentScan.Filter(
            type = FilterType.ASSIGNABLE_TYPE,
            classes = {
                com.matchajob.api.MatchaJobApplication.class,
                com.matchajob.backend.BackendApplication.class
            }
        )
    }
)
public class MatchaJobApplication {

    public static void main(String[] args) {
        SpringApplication.run(MatchaJobApplication.class, args);
    }
}

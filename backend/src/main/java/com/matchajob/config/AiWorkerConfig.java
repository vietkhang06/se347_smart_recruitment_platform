package com.matchajob.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Duration;

@Configuration
public class AiWorkerConfig {

    @Value("${ai-worker.base-url:http://localhost:8001}")
    private String baseUrl;

    @Value("${ai-worker.connect-timeout-ms:3000}")
    private int connectTimeoutMs;

    @Value("${ai-worker.read-timeout-ms:5000}")
    private int readTimeoutMs;

    @Bean
    public RestClient aiWorkerRestClient() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofMillis(connectTimeoutMs));
        requestFactory.setReadTimeout(Duration.ofMillis(readTimeoutMs));

        return RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .build();
    }
}

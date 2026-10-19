package com.matchajob.api.recruitment.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "jobs")
public class Job {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private String team;
    private String location;
    private String status;
    private Integer applicantsCount = 0;

    private Long employerId;

    private LocalDateTime createdAt = LocalDateTime.now();
}
package com.matchajob.api.recruitment.model;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "job_stages")
public class JobStage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private Integer orderIndex;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id")
    private Job job;
}
package com.matchajob.api.recruitment.model;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "job_skills")
public class JobSkill {

    @EmbeddedId
    private JobSkillId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("jobId")
    @JoinColumn(name = "job_id")
    private Job job;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("skillId")
    @JoinColumn(name = "skill_id")
    private Skill skill;

    @Column(name = "is_required", nullable = false)
    @Builder.Default
    private Boolean isRequired = true;

    public JobSkill(Job job, Skill skill, Boolean isRequired) {
        this.job = job;
        this.skill = skill;
        this.isRequired = isRequired != null ? isRequired : true;
        this.id = new JobSkillId(job.getId(), skill.getId());
    }
}

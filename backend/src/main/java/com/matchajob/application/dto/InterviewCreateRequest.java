package com.matchajob.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InterviewCreateRequest {

    private String applicationId;
    private String candidateId;
    private String jobId;

    private Instant scheduledAt;
    private String date; // e.g. 2026-10-18 or 18/10/2026
    private String time; // e.g. 09:00

    private Integer durationMin;

    private String interviewType;
    private String type; // alias for interviewType

    private String interviewMode; // online or onsite
    private String meetingLink;
    private String location;

    private String participants;
    private String people; // alias for participants

    private String note;
    private String status;
}

package com.matchajob.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InterviewUpdateRequest {

    private Instant scheduledAt;
    private String date;
    private String time;
    private Integer durationMin;

    private String interviewType;
    private String type; // alias

    private String interviewMode;
    private String meetingLink;
    private String location;

    private String participants;
    private String people; // alias

    private String note;
    private String status;
}

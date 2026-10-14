package com.matchajob.application.dto;

import lombok.*;

import java.util.List;
import java.util.UUID;

/**
 * Response DTO wrapping the full ranking list for a job's applications.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApplicationRankingResponse {

    private UUID jobId;
    private int totalCandidates;
    private List<ApplicationRankingItem> items;
}

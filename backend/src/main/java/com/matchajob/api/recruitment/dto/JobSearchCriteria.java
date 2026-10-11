package com.matchajob.api.recruitment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobSearchCriteria {
    private String keyword;
    private UUID categoryId;
    private String level;
    private String workType;
    private String location;
    private Long salaryMin;
    private Long salaryMax;
    private List<UUID> skillIds;
    private String status;

    @Builder.Default
    private String sortBy = "postedAt_desc";

    @Builder.Default
    private int page = 0;

    @Builder.Default
    private int size = 10;
}

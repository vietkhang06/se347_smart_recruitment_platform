package com.matchajob.application.dto;

import lombok.*;

import java.util.List;

/**
 * Paginated response wrapper for application listings.
 * Conforms to project standards with page metadata.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApplicationListResponse {

    private List<ApplicationDetailResponse> items;
    private long totalItems;
    private int page;
    private int size;
    private int totalPages;
}

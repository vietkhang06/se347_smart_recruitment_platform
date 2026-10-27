package com.matchajob.api.recruitment.service;

import com.matchajob.api.recruitment.repository.JobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class StatsService {
    private final JobRepository jobRepository;

    public Map<String, Long> getJobCountByStatus() {
        List<Object[]> results = jobRepository.countJobsByStatus();
        Map<String, Long> stats = new HashMap<>();
        for (Object[] row : results) {
            String status = (String) row[0];
            Long count = (Long) row[1];
            stats.put(status, count);
        }
        return stats;
    }
}

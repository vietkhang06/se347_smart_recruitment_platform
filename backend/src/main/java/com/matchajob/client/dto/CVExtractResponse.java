package com.matchajob.client.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CVExtractResponse {

    @JsonProperty("raw_text")
    private String rawText;

    @JsonProperty("parsed_data")
    private Map<String, Object> parsedData;

    @JsonProperty("char_count")
    private Integer charCount;

    @JsonProperty("page_count")
    private Integer pageCount;
}

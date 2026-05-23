package com.wealthio.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ErrorResponse {
    private String message;

    @JsonProperty("status_code")
    private int statusCode;

    @JsonProperty("timestamp")
    private long timestamp;
}


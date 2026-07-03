package com.wealthio.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.DefaultUriBuilderFactory;

@Configuration
public class WebClientConfig {

    @Value("${ML_SERVICE_URL:http://localhost:8001}")
    private String mlServiceUrl;

    @Bean
    public RestTemplate mlRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10000); // 10 seconds
        factory.setReadTimeout(60000);    // 60 seconds

        RestTemplate restTemplate = new RestTemplate(factory);
        restTemplate.setUriTemplateHandler(new DefaultUriBuilderFactory(mlServiceUrl));
        return restTemplate;
    }
}

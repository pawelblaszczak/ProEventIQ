package dev.knightcore.proeventiq.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.util.Map;

@Component
public class RequestMappingLoggingBeanPostProcessor implements BeanPostProcessor {

    private static final Logger logger = LoggerFactory.getLogger(RequestMappingLoggingBeanPostProcessor.class);

    @Override
    public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
        if (bean instanceof RequestMappingHandlerMapping) {
            RequestMappingHandlerMapping mapping = (RequestMappingHandlerMapping) bean;
            logger.info("=== Request Mappings ===");
            Map<RequestMappingInfo, HandlerMethod> handlerMethods = mapping.getHandlerMethods();
            handlerMethods.forEach((mappingInfo, handlerMethod) -> {
                logger.info("Mapping: {}, Handler: {}", mappingInfo, handlerMethod);
            });
            logger.info("=====================");
        }
        return bean;
    }
}

package com.smartlms.submission_management_service.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Base64;
import java.util.Map;

/**
 * Lightweight JWT payload parser used for request-level ownership checks.
 *
 * This class decodes the payload section of a Bearer JWT without verifying
 * the signature — it is expected that signature verification is performed by
 * the API gateway before requests reach this service.
 *
 * Role values in this system: "student" | "lecture"
 * userId field: "userId" with fallback to "sub"
 */
public final class JwtUtils {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private JwtUtils() {}

    /**
     * Parse JWT claims from an Authorization header value.
     *
     * @param authHeader value of the Authorization header (e.g. "Bearer eyJ...")
     * @return decoded payload as a map, or null if missing / malformed
     */
    public static Map<String, Object> parseClaims(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        String token = authHeader.substring(7).trim();
        String[] parts = token.split("\\.");
        if (parts.length < 2) return null;
        try {
            byte[] payload = Base64.getUrlDecoder().decode(parts[1]);
            return MAPPER.readValue(payload, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Extract the caller's userId from parsed claims.
     * Prefers the "userId" field; falls back to "sub".
     */
    public static String extractUserId(Map<String, Object> claims) {
        if (claims == null) return null;
        Object id = claims.getOrDefault("userId", claims.get("sub"));
        return id != null ? String.valueOf(id) : null;
    }

    /** Extract the caller's role ("student" or "lecture").
     *  Checks both "role" and "userRole" because the Next.js auth service
     *  signs tokens with the key "userRole". */
    public static String extractRole(Map<String, Object> claims) {
        if (claims == null) return null;
        Object role = claims.get("role");
        if (role == null) role = claims.get("userRole");
        return role != null ? String.valueOf(role) : null;
    }

    public static boolean isLecturer(Map<String, Object> claims) {
        return "lecture".equals(extractRole(claims));
    }

    public static boolean isStudent(Map<String, Object> claims) {
        return "student".equals(extractRole(claims));
    }
}

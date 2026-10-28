package com.matchajob.matching.repository;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Repository
public class EmbeddingRepository {

    public static final int VECTOR_DIMENSION = 1536;

    private final JdbcClient jdbcClient;

    public EmbeddingRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public void saveEmbedding(UUID id, String entityType, UUID entityId, int chunkIndex, String chunkText, List<Float> embedding) {
        validateEntityType(entityType);
        if (embedding == null || embedding.size() != VECTOR_DIMENSION) {
            int size = embedding == null ? 0 : embedding.size();
            throw new IllegalArgumentException("Embedding dimension must be exactly " + VECTOR_DIMENSION + ", got " + size);
        }
        String vectorString = "[" + embedding.stream().map(String::valueOf).collect(Collectors.joining(",")) + "]";

        jdbcClient.sql("""
            INSERT INTO embeddings (id, entity_type, entity_id, chunk_index, chunk_text, embedding, created_at)
            VALUES (?, ?, ?, ?, ?, ?::vector, now())
            ON CONFLICT (entity_type, entity_id, chunk_index)
            DO UPDATE SET chunk_text = EXCLUDED.chunk_text, embedding = EXCLUDED.embedding
            """)
            .params(id, entityType, entityId, chunkIndex, chunkText, vectorString)
            .update();
    }

    public boolean hasEmbedding(String entityType, UUID entityId) {
        validateEntityType(entityType);
        Integer count = jdbcClient.sql("""
            SELECT 1 FROM embeddings
            WHERE entity_type = ? AND entity_id = ?
            LIMIT 1
            """)
            .params(entityType, entityId)
            .query(Integer.class)
            .optional()
            .orElse(0);
        return count != null && count > 0;
    }

    public Optional<List<Float>> findEmbedding(String entityType, UUID entityId) {
        validateEntityType(entityType);
        return jdbcClient.sql("""
            SELECT embedding::text FROM embeddings
            WHERE entity_type = ? AND entity_id = ?
            ORDER BY chunk_index ASC
            LIMIT 1
            """)
            .params(entityType, entityId)
            .query((rs, rowNum) -> parseVector(rs.getString(1)))
            .optional();
    }

    public Optional<Double> calculateCosineDistance(String entityType1, UUID entityId1, String entityType2, UUID entityId2) {
        validateEntityType(entityType1);
        validateEntityType(entityType2);
        return jdbcClient.sql("""
            SELECT (e1.embedding <=> e2.embedding) AS distance
            FROM embeddings e1
            CROSS JOIN embeddings e2
            WHERE e1.entity_type = ? AND e1.entity_id = ?
              AND e2.entity_type = ? AND e2.entity_id = ?
            ORDER BY e1.chunk_index ASC, e2.chunk_index ASC
            LIMIT 1
            """)
            .params(entityType1, entityId1, entityType2, entityId2)
            .query(Double.class)
            .optional();
    }

    public int deleteEmbedding(String entityType, UUID entityId) {
        validateEntityType(entityType);
        return jdbcClient.sql("""
            DELETE FROM embeddings
            WHERE entity_type = ? AND entity_id = ?
            """)
            .params(entityType, entityId)
            .update();
    }

    public record EntitySimilarity(UUID entityId, double similarityScore, double cosineDistance) {}

    public List<EntitySimilarity> findSimilarEntitiesWithScore(String entityType, List<Float> queryEmbedding, int limit) {
        validateEntityType(entityType);
        if (queryEmbedding == null || queryEmbedding.size() != VECTOR_DIMENSION) {
            int size = queryEmbedding == null ? 0 : queryEmbedding.size();
            throw new IllegalArgumentException("Embedding dimension must be exactly " + VECTOR_DIMENSION + ", got " + size);
        }
        String vectorString = "[" + queryEmbedding.stream().map(String::valueOf).collect(Collectors.joining(",")) + "]";

        return jdbcClient.sql("""
            SELECT entity_id, (embedding <=> ?::vector) AS distance
            FROM embeddings
            WHERE entity_type = ?
            ORDER BY embedding <=> ?::vector
            LIMIT ?
            """)
            .params(vectorString, entityType, vectorString, limit)
            .query((rs, rowNum) -> {
                UUID entityId = rs.getObject("entity_id", UUID.class);
                double distance = rs.getDouble("distance");
                double similarityScore = normalizeCosineDistance(distance);
                return new EntitySimilarity(entityId, similarityScore, distance);
            })
            .list();
    }

    public List<UUID> findSimilarEntities(String entityType, List<Float> queryEmbedding, int limit) {
        return findSimilarEntitiesWithScore(entityType, queryEmbedding, limit).stream()
                .map(EntitySimilarity::entityId)
                .toList();
    }

    /**
     * Normalizes pgvector cosine distance [0, 2] to a percentage score in [0.0, 100.0].
     * Mapping formula: clamp(1.0 - distance / 2.0, 0.0, 1.0) * 100.0.
     * Distance 0.0 (identical vectors) -> 100.0
     * Distance 1.0 (orthogonal vectors) -> 50.0
     * Distance 2.0 (diametrically opposite) -> 0.0
     */
    public static double normalizeCosineDistance(Double distance) {
        if (distance == null || Double.isNaN(distance) || Double.isInfinite(distance)) {
            return 0.0;
        }
        double normalized = 1.0 - (distance / 2.0);
        double clamped = Math.max(0.0, Math.min(1.0, normalized));
        return Math.round(clamped * 1000.0) / 10.0;
    }

    /**
     * Calculates cosine distance between two dense vectors in memory.
     * Returns a distance in [0.0, 2.0] where distance = 1.0 - cosine_similarity.
     */
    public static double computeCosineDistance(List<Float> v1, List<Float> v2) {
        if (v1 == null || v2 == null || v1.size() != v2.size() || v1.isEmpty()) {
            throw new IllegalArgumentException("Vectors must be non-null and have equal non-zero dimension");
        }
        double dot = 0.0;
        double norm1 = 0.0;
        double norm2 = 0.0;
        for (int i = 0; i < v1.size(); i++) {
            float a = v1.get(i);
            float b = v2.get(i);
            dot += a * b;
            norm1 += a * a;
            norm2 += b * b;
        }
        if (norm1 <= 0.0 || norm2 <= 0.0) return 2.0;
        double cosine = dot / (Math.sqrt(norm1) * Math.sqrt(norm2));
        cosine = Math.max(-1.0, Math.min(1.0, cosine));
        return 1.0 - cosine;
    }

    public static List<Float> parseVector(String vectorText) {
        if (vectorText == null || vectorText.isBlank()) return List.of();
        String cleaned = vectorText.trim();
        if (cleaned.startsWith("[") && cleaned.endsWith("]")) {
            cleaned = cleaned.substring(1, cleaned.length() - 1);
        }
        if (cleaned.isBlank()) return List.of();
        String[] parts = cleaned.split(",");
        List<Float> result = new ArrayList<>(parts.length);
        for (String p : parts) {
            result.add(Float.parseFloat(p.trim()));
        }
        return result;
    }

    private void validateEntityType(String entityType) {
        if (!"cv_version".equals(entityType) && !"job".equals(entityType)) {
            throw new IllegalArgumentException("Unsupported entity_type: " + entityType + ". Allowed: 'cv_version', 'job'");
        }
    }
}

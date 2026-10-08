package com.matchajob.matching.repository;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Repository
public class EmbeddingRepository {

    private final JdbcClient jdbcClient;

    public EmbeddingRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public void saveEmbedding(UUID id, String entityType, UUID entityId, int chunkIndex, String chunkText, List<Float> embedding) {
        if (embedding == null || embedding.size() != 1536) {
            int size = embedding == null ? 0 : embedding.size();
            throw new IllegalArgumentException("Embedding dimension must be exactly 1536, got " + size);
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

    public List<UUID> findSimilarEntities(String entityType, List<Float> queryEmbedding, int limit) {
        if (queryEmbedding == null || queryEmbedding.size() != 1536) {
            int size = queryEmbedding == null ? 0 : queryEmbedding.size();
            throw new IllegalArgumentException("Embedding dimension must be exactly 1536, got " + size);
        }
        String vectorString = "[" + queryEmbedding.stream().map(String::valueOf).collect(Collectors.joining(",")) + "]";

        return jdbcClient.sql("""
            SELECT entity_id FROM embeddings
            WHERE entity_type = ?
            ORDER BY embedding <=> ?::vector
            LIMIT ?
            """)
            .params(entityType, vectorString, limit)
            .query(UUID.class)
            .list();
    }
}

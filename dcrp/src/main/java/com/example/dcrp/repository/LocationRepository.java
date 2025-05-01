package com.example.dcrp.repository;

import com.example.dcrp.model.Location;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface LocationRepository extends MongoRepository<Location, String> {
    // Custom query method to delete locations older than a specific LocalDateTime
    void deleteByCreatedAtBefore(LocalDateTime date);

    // Additional query methods
    List<Location> findByLatitudeBetween(double minLatitude, double maxLatitude);
    List<Location> findByLongitudeBetween(double minLongitude, double maxLongitude);
    List<Location> findByNameContainingIgnoreCase(String name);
    List<Location> findByAddressContainingIgnoreCase(String address);
}
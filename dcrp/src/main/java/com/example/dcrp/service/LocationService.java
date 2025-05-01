package com.example.dcrp.service;

import com.example.dcrp.model.Location;
import com.example.dcrp.repository.LocationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class LocationService {

    @Autowired
    private LocationRepository locationRepository;

    public List<Location> findAll() {
        return locationRepository.findAll();
    }

    public Optional<Location> findById(String id) {
        return locationRepository.findById(id);
    }

    public Location save(Location location) {
        if (location.getCreatedAt() == null) {
            location.setCreatedAt(LocalDateTime.now());
        }
        return locationRepository.save(location);
    }

    public void deleteById(String id) {
        locationRepository.deleteById(id);
    }

    public void deleteByCreatedAtBefore(LocalDateTime date) {
        locationRepository.deleteByCreatedAtBefore(date);
    }

    // Additional business logic methods
    public List<Location> findNearbyLocations(double latitude, double longitude, double radiusKm) {
        // Implement logic to find locations within radius
        // This demonstrates the service layer adding business logic
        double degreeRange = radiusKm / 111.32; // Approx km per degree
        return locationRepository.findByLatitudeBetween(
                        latitude - degreeRange,
                        latitude + degreeRange
                ).stream()
                .filter(loc -> distanceBetween(loc.getLatitude(), loc.getLongitude(), latitude, longitude) <= radiusKm)
                .collect(Collectors.toList());
    }

    private double distanceBetween(double lat1, double lon1, double lat2, double lon2) {
        // Haversine formula implementation
        final int R = 6371; // Earth radius in km
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
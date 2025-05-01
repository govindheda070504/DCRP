package com.example.dcrp.controller;

import com.example.dcrp.model.Location;
import com.example.dcrp.service.LocationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Date;
import java.util.List;
import java.time.ZoneId;

@RestController
@RequestMapping("/api/locations")
@CrossOrigin(origins = "http://localhost:5173")
public class LocationController {

    @Autowired
    private LocationService locationService;

    @GetMapping
    public ResponseEntity<List<Location>> getAllLocations() {
        List<Location> locations = locationService.findAll();
        return ResponseEntity.ok(locations);
    }

    @PostMapping
    public ResponseEntity<Location> createLocation(@RequestBody Location location) {
        location.setCreatedAt(LocalDateTime.now());
        Location savedLocation = locationService.save(location);
        return ResponseEntity.ok(savedLocation);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Location> getLocationById(@PathVariable String id) {
        return locationService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Location> updateLocation(@PathVariable String id, @RequestBody Location locationDetails) {
        return locationService.findById(id)
                .map(existingLocation -> {
                    existingLocation.setName(locationDetails.getName());
                    existingLocation.setLatitude(locationDetails.getLatitude());
                    existingLocation.setLongitude(locationDetails.getLongitude());
                    existingLocation.setAddress(locationDetails.getAddress());
                    // Preserve original createdAt
                    Location updatedLocation = locationService.save(existingLocation);
                    return ResponseEntity.ok(updatedLocation);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteLocation(@PathVariable String id) {
        locationService.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/cleanup")
    public ResponseEntity<Void> deleteOldLocations(@RequestParam Date cutoffDate) {
        LocalDateTime cutoffDateTime = convertToLocalDateTime(cutoffDate);
        locationService.deleteByCreatedAtBefore(cutoffDateTime);
        return ResponseEntity.noContent().build();
    }

    private LocalDateTime convertToLocalDateTime(Date dateToConvert) {
        return dateToConvert.toInstant()
                .atZone(ZoneId.systemDefault())
                .toLocalDateTime();
    }
}
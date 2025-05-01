package com.example.dcrp.controller;

import com.example.dcrp.service.BusAssignmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.List;
import java.util.HashMap;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/bus-assignment")
@CrossOrigin(origins = "http://localhost:5173")
public class BusAssignmentController {

    @Autowired
    private BusAssignmentService busAssignmentService;

    // Shared data storage (in-memory, consider database for production)
    private final Map<String, Map<String, Object>> studentBusAssignments = new ConcurrentHashMap<>();
    private final Map<String, List<Map<String, Object>>> sharedRoutes = new ConcurrentHashMap<>();


    @GetMapping
    public ResponseEntity<Map<String, Object>> getBusAssignments() {
        Map<String, Object> busAssignments = busAssignmentService.assignBuses();

        if (busAssignments.containsKey("message")) {
            return ResponseEntity.ok(busAssignments);
        }

        System.out.println("Bus Assignments Generated: " + busAssignments);
        return ResponseEntity.ok(busAssignments);
    }


    @PostMapping("/share-to-student")
    public ResponseEntity<String> shareToStudent(
            @RequestParam String studentId,
            @RequestBody Map<String, Object> busInfo) {

        // Validate input
        if (studentId == null || studentId.isEmpty()) {
            return ResponseEntity.badRequest().body("Student ID is required");
        }

        if (busInfo == null || !busInfo.containsKey("busNumber")) {
            return ResponseEntity.badRequest().body("Invalid bus information");
        }

        // Store the assignment
        studentBusAssignments.put(studentId, busInfo);
        System.out.println("Shared with student " + studentId + ": " + busInfo);

        return ResponseEntity.ok("Bus info shared with student " + studentId);
    }


    @GetMapping("/student-bus-info")
    public ResponseEntity<Map<String, Object>> getStudentBusInfo(
            @RequestParam String studentId) {

        if (!studentBusAssignments.containsKey(studentId)) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(studentBusAssignments.get(studentId));
    }

    @PostMapping("/share-to-all")
    public ResponseEntity<String> shareToAllStudents(
            @RequestBody Map<String, Object> sharingData) {

        try {
            // Validate input
            if (sharingData == null || !sharingData.containsKey("routes")) {
                return ResponseEntity.badRequest().body("Invalid sharing data");
            }

            // Process and store the shared routes
            List<Map<String, Object>> routes = (List<Map<String, Object>>) sharingData.get("routes");
            sharedRoutes.put("latest", routes);

            // Also store individual student assignments
            routes.forEach(route -> {
                List<Map<String, Object>> clusters = (List<Map<String, Object>>) route.get("clusters");
                clusters.forEach(cluster -> {
                    List<Map<String, Object>> students = (List<Map<String, Object>>) cluster.get("students");
                    students.forEach(student -> {
                        Map<String, Object> busInfo = new HashMap<>();
                        busInfo.put("busNumber", route.get("busNumber"));
                        busInfo.put("pickupPoint", cluster.get("center"));
                        busInfo.put("pickupTime", cluster.get("pickupTime"));
                        studentBusAssignments.put(student.get("id").toString(), busInfo);
                    });
                });
            });

            return ResponseEntity.ok("Routes shared with all students successfully");

        } catch (Exception e) {
            System.err.println("Error sharing routes: " + e.getMessage());
            return ResponseEntity.internalServerError().body("Failed to share routes");
        }
    }


    @GetMapping("/shared-routes")
    public ResponseEntity<List<Map<String, Object>>> getSharedRoutes() {
        if (!sharedRoutes.containsKey("latest")) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(sharedRoutes.get("latest"));
    }
}
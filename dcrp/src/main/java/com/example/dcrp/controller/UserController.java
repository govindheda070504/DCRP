package com.example.dcrp.controller;

import com.example.dcrp.model.User;
import com.example.dcrp.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/user")
@CrossOrigin(origins = "http://localhost:5173") // Allow frontend access
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    //  Fetch all users
    @GetMapping
    public ResponseEntity<?> getAllUsers() {
        try {
            List<User> users = userRepository.findAll();
            if (users.isEmpty()) {
                return ResponseEntity.ok("No users found");
            }
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error fetching users: " + e.getMessage());
        }
    }

    // Register a new user
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody User user) {
        try {
            // Check if the email is already registered
            Optional<User> existingUser = userRepository.findByEmail(user.getEmail());
            if (existingUser.isPresent()) {
                return ResponseEntity.badRequest().body("Email already registered");
            }

            // Hash the password before saving
            user.setPassword(passwordEncoder.encode(user.getPassword()));

            // Save the user to the database
            User savedUser = userRepository.save(user);

            // Return the saved user (excluding the password)
            savedUser.setPassword(null);
            return ResponseEntity.ok(savedUser);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Registration failed: " + e.getMessage());
        }
    }

    // Login a user
    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody User user) {
        try {
            // Find the user by email
            Optional<User> foundUser = userRepository.findByEmail(user.getEmail());
            if (foundUser.isEmpty()) {
                return ResponseEntity.badRequest().body("User not found");
            }

            // Verify the password
            if (!passwordEncoder.matches(user.getPassword(), foundUser.get().getPassword())) {
                return ResponseEntity.badRequest().body("Invalid password");
            }

            // Return the user (excluding the password)
            foundUser.get().setPassword(null);
            return ResponseEntity.ok(foundUser.get());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Login failed: " + e.getMessage());
        }
    }
}
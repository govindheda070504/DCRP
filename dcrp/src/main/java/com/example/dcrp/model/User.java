package com.example.dcrp.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Data
@Document(collection = "users")
public class User {
    @Id
    private String id;
    private String role; // student or operator
    private String name;
    private String email;
    private String phoneNo;
    private String password;

    // Fields for Students
    private String permanentAddress;
    private Double permanentLatitude;
    private Double permanentLongitude;

    // Fields for Bus Operators
    private String officeAddress;
    private Double officeLatitude;
    private Double officeLongitude;
    private Integer noOfBuses;
    private List<String> busNumbers;
}
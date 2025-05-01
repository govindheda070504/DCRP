package com.example.dcrp.service;
import com.example.dcrp.model.Location;
import com.example.dcrp.model.User;
import com.example.dcrp.repository.LocationRepository;
import com.example.dcrp.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class BusAssignmentService {

    @Autowired
    private LocationRepository locationRepository;

    @Autowired
    private UserRepository userRepository;

    private static final int BUS_CAPACITY = 15;
    private static final double CLUSTER_RADIUS_KM = 1.5;
    private static final Location UNIVERSITY_LOCATION = new Location(30.41643, 77.96720);
    @Value("${google.maps.api.key}")
    private String googleMapsApiKey;
    private static final int STOPPAGE_TIME_SEC = 30;
    private static final LocalTime UNIVERSITY_DEADLINE = LocalTime.of(9, 0);
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm:ss");
    private static final int MIN_CLUSTER_SIZE = 3; // Minimum students per cluster before merging

    public Map<String, Object> assignBuses() {
        List<Location> students = locationRepository.findAll();
        List<User> operators = userRepository.findByRole("BUS_OPERATOR");

        if (students.isEmpty() || operators.isEmpty()) {
            return Collections.singletonMap("message", "No students or buses available!");
        }

        Map<String, Object> response = new HashMap<>();
        Map<String, Object> routes = new LinkedHashMap<>();
        Map<String, Object> stats = new HashMap<>();
        Set<String> assignedStudentIds = new HashSet<>();

        // Calculate travel times for all students
        Map<Location, Double> travelTimes = calculateTravelTimes(students);

        // Form initial clusters
        List<Cluster> clusters = formClusters(students, travelTimes, assignedStudentIds);

        // Assign buses to clusters with optimized routing
        assignBusesToClusters(clusters, operators, routes);

        // Calculate statistics
        int totalBusesAvailable = countTotalBuses(operators);
        int totalStudents = students.size();
        int studentsAssigned = assignedStudentIds.size();
        double utilizationRate = (double) studentsAssigned / (routes.size() * BUS_CAPACITY);


        stats.put("totalBusesAvailable", totalBusesAvailable);
        stats.put("totalBusesUsed", routes.size());
        stats.put("studentsAssigned", studentsAssigned);
        stats.put("totalStudents", totalStudents);
        stats.put("utilizationRate", String.format("%.1f%%", utilizationRate * 100));
        stats.put("unassignedStudents", totalStudents - studentsAssigned);

        response.put("routes", routes);
        response.put("stats", stats);
        response.put("totalClusters", clusters.size());

        return response;
    }

    private List<Cluster> formClusters(List<Location> students,
                                       Map<Location, Double> travelTimes,
                                       Set<String> assignedIds) {
        // Sort students by travel time (farthest first)
        List<Location> unassigned = students.stream()
                .filter(s -> !assignedIds.contains(s.getId()))
                .sorted(Comparator.comparing(travelTimes::get).reversed())
                .collect(Collectors.toList());

        List<Cluster> clusters = new ArrayList<>();

        while (!unassigned.isEmpty()) {
            Location seed = unassigned.remove(0);
            Cluster cluster = new Cluster(seed);
            assignedIds.add(seed.getId());

            // Find nearby students within radius
            Iterator<Location> it = unassigned.iterator();
            while (it.hasNext() && cluster.getStudents().size() < BUS_CAPACITY) {
                Location student = it.next();
                double distance = distanceBetween(seed, student);
                if (distance < CLUSTER_RADIUS_KM) {
                    cluster.addStudent(student);
                    assignedIds.add(student.getId());
                    it.remove();
                }
            }

            cluster.calculateCenter();
            clusters.add(cluster);
        }

        // Merge small clusters that are close to each other
        return mergeSmallClusters(clusters);
    }

    private List<Cluster> mergeSmallClusters(List<Cluster> clusters) {
        List<Cluster> merged = new ArrayList<>();
        clusters.sort(Comparator.comparing(c -> c.getStudents().size()));

        for (Cluster cluster : clusters) {
            if (cluster.getStudents().size() >= MIN_CLUSTER_SIZE) {
                merged.add(cluster);
                continue;
            }

            // Find nearest suitable cluster to merge with
            Optional<Cluster> nearest = merged.stream()
                    .filter(c -> c.getStudents().size() + cluster.getStudents().size() <= BUS_CAPACITY)
                    .min(Comparator.comparing(c -> distanceBetween(c.getCenter(), cluster.getCenter())));

            if (nearest.isPresent()) {
                nearest.get().merge(cluster);
            } else {
                merged.add(cluster);
            }
        }

        return merged;
    }

    private void assignBusesToClusters(List<Cluster> clusters,
                                       List<User> operators,
                                       Map<String, Object> routes) {
        // Sort clusters by pickup time (earliest first)
        clusters.sort(Comparator.comparing(this::calculateClusterPickupTime));

        int busIndex = 0;
        List<User> availableOperators = new ArrayList<>(operators);

        while (!clusters.isEmpty() && !availableOperators.isEmpty()) {
            User operator = availableOperators.remove(0);
            for (String busNumber : operator.getBusNumbers()) {
                if (clusters.isEmpty()) break;

                String busKey = operator.getName() + " - Bus " + busNumber;
                Map<String, Object> routeData = new HashMap<>();

                // Assign multiple clusters to this bus
                List<Cluster> busClusters = new ArrayList<>();
                int remainingCapacity = BUS_CAPACITY;

                Iterator<Cluster> it = clusters.iterator();
                while (it.hasNext() && remainingCapacity > 0) {
                    Cluster cluster = it.next();
                    if (cluster.getStudents().size() <= remainingCapacity) {
                        busClusters.add(cluster);
                        remainingCapacity -= cluster.getStudents().size();
                        it.remove();
                    }
                }

                if (!busClusters.isEmpty()) {
                    // Calculate route timing
                    LocalTime currentTime = UNIVERSITY_DEADLINE;
                    List<Map<String, Object>> clusterDetails = new ArrayList<>();

                    for (int i = busClusters.size() - 1; i >= 0; i--) {
                        Cluster cluster = busClusters.get(i);
                        Location farthestStudent = Collections.max(cluster.getStudents(),
                                Comparator.comparing(this::distanceToUniversity));

                        double timeToUniv = getTravelTime(farthestStudent, UNIVERSITY_LOCATION);
                        LocalTime clusterPickupTime = UNIVERSITY_DEADLINE.minusSeconds((long)timeToUniv);

                        // If not the last cluster, add travel time from previous cluster
                        if (i < busClusters.size() - 1) {
                            Cluster nextCluster = busClusters.get(i + 1);
                            double travelTime = getTravelTime(cluster.getCenter(), nextCluster.getCenter());
                            clusterPickupTime = clusterPickupTime.minusSeconds((long)travelTime);
                        }

                        Map<String, Object> details = mapClusterDetails(cluster);
                        details.put("pickupTime", clusterPickupTime.format(TIME_FORMATTER));
                        clusterDetails.add(details);

                        // Update current time for next cluster
                        currentTime = clusterPickupTime;
                    }

                    // Reverse to maintain chronological order
                    Collections.reverse(clusterDetails);
                    routeData.put("clusters", clusterDetails);
                    routeData.put("departureTime", currentTime.format(TIME_FORMATTER));
                    routes.put(busKey, routeData);
                }
            }
        }
    }

    private Map<String, Object> mapClusterDetails(Cluster cluster) {
        Map<String, Object> details = new HashMap<>();
        details.put("center", mapLocation(cluster.getCenter()));
        details.put("students", convertLocationsToMaps(cluster.getStudents()));
        details.put("studentCount", cluster.getStudents().size());
        details.put("distanceToUniversity", distanceToUniversity(cluster.getCenter()));
        return details;
    }

    private LocalTime calculateClusterPickupTime(Cluster cluster) {
        Location farthest = Collections.max(cluster.getStudents(),
                Comparator.comparing(this::distanceToUniversity));
        double time = getTravelTime(farthest, UNIVERSITY_LOCATION);
        return UNIVERSITY_DEADLINE.minusSeconds((long) time);
    }

    private Map<Location, Double> calculateTravelTimes(List<Location> students) {
        Map<Location, Double> times = new HashMap<>();
        for (Location student : students) {
            double time = getTravelTime(student, UNIVERSITY_LOCATION);
            times.put(student, time);
        }
        return times;
    }

    private double getTravelTime(Location origin, Location destination) {
        String url = String.format(
                "https://maps.googleapis.com/maps/api/distancematrix/json" +
                        "?origins=%f,%f&destinations=%f,%f&departure_time=now&key=%s",
                origin.getLatitude(), origin.getLongitude(),
                destination.getLatitude(), destination.getLongitude(),
                googleMapsApiKey
        );

        try {
            Map<String, Object> response = new RestTemplate().getForObject(url, Map.class);
            if (response != null && response.containsKey("rows")) {
                List<Map<String, Object>> rows = (List<Map<String, Object>>) response.get("rows");
                if (rows != null && !rows.isEmpty()) {
                    Map<String, Object> firstRow = rows.get(0);
                    if (firstRow.containsKey("elements")) {
                        List<Map<String, Object>> elements = (List<Map<String, Object>>) firstRow.get("elements");
                        if (elements != null && !elements.isEmpty()) {
                            Map<String, Object> element = elements.get(0);
                            if (element.containsKey("duration_in_traffic")) {
                                Map<String, Object> duration = (Map<String, Object>) element.get("duration_in_traffic");
                                if (duration != null && duration.containsKey("value")) {
                                    Object value = duration.get("value");
                                    if (value instanceof Number) {
                                        return ((Number) value).doubleValue() + STOPPAGE_TIME_SEC;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Error fetching travel time: " + e.getMessage());
        }
        return Double.MAX_VALUE;
    }

    private List<Map<String, Object>> convertLocationsToMaps(List<Location> locations) {
        if (locations.isEmpty()) return Collections.emptyList();

        Location center = new Location(
                locations.stream().mapToDouble(Location::getLatitude).average().orElse(0),
                locations.stream().mapToDouble(Location::getLongitude).average().orElse(0)
        );

        return locations.stream()
                .map(loc -> {
                    Map<String, Object> map = mapLocationWithDetails(loc);
                    map.put("distanceToCenter", distanceBetween(center, loc));
                    return map;
                })
                .collect(Collectors.toList());
    }

    private Map<String, Object> mapLocationWithDetails(Location loc) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", loc.getId() != null ? loc.getId() : "");
        map.put("name", loc.getName() != null ? loc.getName() : "Unknown");
        map.put("latitude", loc.getLatitude());
        map.put("longitude", loc.getLongitude());
        map.put("address", loc.getAddress() != null ? loc.getAddress() : "");
        return map;
    }

    private Map<String, Object> mapLocation(Location location) {
        Map<String, Object> map = new HashMap<>();
        map.put("latitude", location.getLatitude());
        map.put("longitude", location.getLongitude());
        return map;
    }

    private int countTotalBuses(List<User> operators) {
        return operators.stream()
                .mapToInt(op -> op.getBusNumbers().size())
                .sum();
    }

    private double distanceBetween(Location a, Location b) {
        final int R = 6371; // Earth radius in km
        double latDiff = Math.toRadians(b.getLatitude() - a.getLatitude());
        double lonDiff = Math.toRadians(b.getLongitude() - a.getLongitude());
        double aVal = Math.sin(latDiff/2) * Math.sin(latDiff/2) +
                Math.cos(Math.toRadians(a.getLatitude())) *
                        Math.cos(Math.toRadians(b.getLatitude())) *
                        Math.sin(lonDiff/2) * Math.sin(lonDiff/2);
        return R * 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1-aVal));
    }

    private double distanceToUniversity(Location loc) {
        return distanceBetween(loc, UNIVERSITY_LOCATION);
    }

    private static class Cluster {
        private List<Location> students;
        private Location center;

        public Cluster(Location firstStudent) {
            this.students = new ArrayList<>();
            this.students.add(firstStudent);
        }

        public void addStudent(Location student) {
            students.add(student);
        }

        public void merge(Cluster other) {
            this.students.addAll(other.getStudents());
            calculateCenter();
        }

        public void calculateCenter() {
            double avgLat = students.stream()
                    .mapToDouble(Location::getLatitude)
                    .average()
                    .orElse(0);
            double avgLng = students.stream()
                    .mapToDouble(Location::getLongitude)
                    .average()
                    .orElse(0);
            this.center = new Location(avgLat, avgLng);
        }

        public List<Location> getStudents() { return students; }
        public Location getCenter() { return center; }
    }
}

//final
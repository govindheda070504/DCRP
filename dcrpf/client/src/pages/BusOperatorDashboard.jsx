import React, { useEffect, useState } from "react";
import axios from "axios";
import { GoogleMap, LoadScript, Marker, DirectionsRenderer } from "@react-google-maps/api";
import {
  Box,
  Card,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Drawer,
  List,
  Button,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  TextField,
  CircularProgress,
  Alert,
  Chip,
  Snackbar,
  Avatar,
  ListItemAvatar
} from "@mui/material";
import Grid from "@mui/material/Grid"; 

import MenuIcon from "@mui/icons-material/Menu";
import DirectionsBusIcon from "@mui/icons-material/DirectionsBus";
import LogoutIcon from "@mui/icons-material/Logout";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PlaceIcon from "@mui/icons-material/Place";
import PeopleIcon from "@mui/icons-material/People";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";

const mapContainerStyle = { width: "100%", height: "500px" };
const center = { lat: 30.41643, lng: 77.96720 };
const routeColors = ["#FF5733", "#33FF57", "#3357FF", "#F4C542", "#9D33FF", "#33FFF1"];
const libraries = ["places", "directions"];

const theme = createTheme({
  palette: {
    primary: { main: "#5E35B1" },
    secondary: { main: "#FFC107" },
    background: { default: "#F4F6F8", paper: "#FFFFFF" },
    text: { primary: "#212121", secondary: "#757575" },
  },
});
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const BusOperatorDashboard = ({ user, setUser }) => {
  const [busData, setBusData] = useState({ routes: {}, stats: {} });
  const [selectedBus, setSelectedBus] = useState(null);
  const [directions, setDirections] = useState({});
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [busStartTime, setBusStartTime] = useState("");
  const [estimatedTimes, setEstimatedTimes] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [waypoints, setWaypoints] = useState([]);
  const [orderedClusters, setOrderedClusters] = useState([]);
  const navigate = useNavigate();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  //+++++++++++++++++++++++++

  const shareWithAllStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Verify backend connection first
      await axios.get('http://localhost:9090/api/bus-assignment');
  
      // Get assignments
      const { data: { routes } } = await axios.get(
        "http://localhost:9090/api/bus-assignment"
      );
  
      // Transform data to match backend expectations
      const sharingData = {
        routes: Object.entries(routes).map(([busKey, routeData]) => {
          const clusters = Array.isArray(routeData.clusters) 
            ? routeData.clusters 
            : [{
                center: routeData.pickupPoint || routeData.center,
                students: routeData.students || [],
                pickupTime: routeData.pickupTime || "08:00 AM"
              }];
  
          return {
            busNumber: busKey,
            clusters: clusters.map(cluster => ({
              center: {
                latitude: cluster.center?.latitude || cluster.center?.lat,
                longitude: cluster.center?.longitude || cluster.center?.lng
              },
              students: cluster.students.map(s => ({ 
                id: s.id || s._id || String(Math.random()),
                name: s.name || "Student"
              })),
              pickupTime: cluster.pickupTime
            }))
          };
        })
      };
  
      // Send to backend
      const response = await axios.post(
        "http://localhost:9090/api/bus-assignment/share-to-all",
        sharingData,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
  
      setSnackbarMessage("Bus assignments shared successfully with all students!");
      setSnackbarOpen(true);
    } catch (error) {
      const errorMsg = error.response?.data?.message || 
                      error.message || 
                      "Failed to share routes";
      
      console.error("Sharing failed:", errorMsg);
      setError(errorMsg);
      setSnackbarMessage(errorMsg);
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };
  
  //++++++++++++++++++++++++
  useEffect(() => {
    const fetchBusData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get("http://localhost:9090/api/bus-assignment");
        
        if (response.data?.routes) {
          // Transform data to group clusters by bus
          const busRoutes = {};
          Object.entries(response.data.routes).forEach(([busKey, routeData]) => {
            if (!busRoutes[busKey]) {
              busRoutes[busKey] = {
                ...routeData,
                clusters: []
              };
            }
            
            if (routeData.clusters && routeData.clusters.length > 0) {
              busRoutes[busKey].clusters = routeData.clusters;
            } else {
              // Fallback for single-cluster buses
              busRoutes[busKey].clusters = [{
                center: routeData.pickupPoint,
                students: routeData.students,
                pickupTime: routeData.pickupTime
              }];
            }
          });

          setBusData({
            routes: busRoutes,
            stats: response.data.stats,
            totalClusters: response.data.totalClusters || Object.keys(busRoutes).length
          });

          const busKeys = Object.keys(busRoutes);
          if (busKeys.length > 0 && !selectedBus) {
            setSelectedBus(busKeys[0]);
          }
        }
      } catch (error) {
        setError("Failed to load bus data. Please try again.");
        console.error("Error fetching bus data:", error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchBusData();
    const interval = setInterval(fetchBusData, 5 * 60 * 1000);
  
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedBus && busData.routes?.[selectedBus]?.clusters) {
      const clusters = busData.routes[selectedBus].clusters;
      // Sort clusters by distance from university (farthest first)
      const sortedClusters = [...clusters].sort((a, b) => {
        const distA = calculateDistance(a.center, center);
        const distB = calculateDistance(b.center, center);
        return distB - distA;
      });
      setOrderedClusters(sortedClusters);
      
      if (window.google) {
        setWaypoints(sortedClusters.map(cluster => ({
          location: new window.google.maps.LatLng(
            cluster.center.latitude,
            cluster.center.longitude
          ),
          stopover: true
        })));
      }
    }
  }, [selectedBus, busData]);

  useEffect(() => {
    if (selectedBus && orderedClusters.length > 0 && waypoints.length > 0) {
      calculateRoute();
    }
  }, [selectedBus, orderedClusters, waypoints, busStartTime]);

  const calculateDistance = (point1, point2) => {
    const R = 6371; // Earth radius in km
    const dLat = (point2.lat - point1.latitude) * Math.PI / 180;
    const dLon = (point2.lng - point1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const calculateRoute = () => {
    if (!window.google || !selectedBus || !orderedClusters.length) return;

    const directionsService = new window.google.maps.DirectionsService();
    const firstStop = orderedClusters[0].center;

    directionsService.route({
      origin: { lat: firstStop.latitude, lng: firstStop.longitude },
      destination: center,
      waypoints: waypoints.slice(1), // All stops except first one
      travelMode: window.google.maps.TravelMode.DRIVING,
      drivingOptions: {
        departureTime: busStartTime ? new Date(busStartTime) : new Date(),
        trafficModel: "bestguess"
      },
      optimizeWaypoints: false 
    }, (result, status) => {
      if (status === "OK") {
        setDirections({ [selectedBus]: result });
        calculateETAs(result.routes[0].legs);
      } else {
        console.error(`Directions error: ${status}`);
      }
    });
  };

  const calculateETAs = (legs) => {
    if (!busStartTime || !legs) return;
  
    const times = {};
    const startTime = new Date(busStartTime).getTime();
    let cumulativeTime = 0;
  
    // First stop uses the exact departure time
    times[0] = {
      pickupTime: new Date(startTime).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }),
      arrivalTime: new Date(startTime).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }),
      duration: "0 min",
      durationValue: 0
    };
  
    // Calculate times for intermediate stops
    for (let i = 0; i < legs.length - 1; i++) {
      const leg = legs[i];
      cumulativeTime += leg.duration_in_traffic?.value || leg.duration.value;
      times[i + 1] = {
        pickupTime: new Date(startTime + cumulativeTime * 1000).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        }),
        arrivalTime: new Date(startTime + cumulativeTime * 1000).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        }),
        duration: formatDuration(leg.duration_in_traffic?.value || leg.duration.value),
        durationValue: leg.duration_in_traffic?.value || leg.duration.value
      };
    }
  
    // Calculate university arrival time separately (last leg)
    const lastLeg = legs[legs.length - 1];
    cumulativeTime += lastLeg.duration_in_traffic?.value || lastLeg.duration.value;
    times.university = {
      arrivalTime: new Date(startTime + cumulativeTime * 1000).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }),
      duration: formatDuration(lastLeg.duration_in_traffic?.value || lastLeg.duration.value),
      durationValue: lastLeg.duration_in_traffic?.value || lastLeg.duration.value
    };
  
    setEstimatedTimes(times);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    return `${mins} min${mins !== 1 ? 's' : ''}`;
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  };

  const renderClusterInfo = () => {
    if (!selectedBus || !orderedClusters.length) return null;
    
    return (
      <Card sx={{ mt: 3, p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Route Information
          <Chip 
            icon={<PeopleIcon />} 
            label={`${orderedClusters.reduce((sum, cluster) => sum + cluster.students.length, 0)} students`} 
            sx={{ ml: 2 }} 
          />
        </Typography>
        
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1">Stops Sequence:</Typography>
            <List>
              {orderedClusters.map((cluster, index) => (
                <ListItem key={index}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: routeColors[index % routeColors.length] }}>
                      {index + 1}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={`Stop ${index + 1}`}
                    secondary={`${cluster.center.latitude.toFixed(6)}, ${cluster.center.longitude.toFixed(6)}`}
                  />
                </ListItem>
              ))}
            </List>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1">Route Details:</Typography>
            {estimatedTimes[0] && (
              <Box sx={{ mt: 2 }}>
                <Typography><strong>Start Time:</strong> {estimatedTimes[0].pickupTime}</Typography>
                <Typography><strong>Estimated Arrival:</strong> {estimatedTimes.university.arrivalTime}</Typography>
                <Typography><strong>Total Travel Time:</strong> {formatDuration(
                  Object.values(estimatedTimes).reduce((sum, time) => sum + (time.durationValue || 0), 0)
                )}</Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </Card>
    );
  };

  const renderStudentList = () => {
    if (!selectedBus || !orderedClusters.length) return null;
    
    // Flatten all students from all clusters
    const allStudents = orderedClusters.flatMap((cluster, clusterIndex) => 
      cluster.students.map((student, studentIndex) => ({
        ...student,
        clusterIndex,
        studentIndex
      }))
    );
    
    return (
      <Card sx={{ p: 3, height: "100%" }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          All Students ({allStudents.length})
        </Typography>
        <List sx={{ maxHeight: 300, overflow: 'auto' }}>
          {allStudents.map((student, index) => (
            <ListItem 
              key={index} 
              disablePadding
              onClick={() => setSelectedCluster({
                ...student,
                index: student.studentIndex,
                clusterIndex: student.clusterIndex
              })}
            >
              <ListItemButton>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: routeColors[student.clusterIndex % routeColors.length] }}>
                    {student.clusterIndex + 1}.{student.studentIndex + 1}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={student.name || `Student ${student.studentIndex + 1}`}
                  secondary={`Stop ${student.clusterIndex + 1} - ${student.latitude.toFixed(4)}, ${student.longitude.toFixed(4)}`}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Card>
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <LoadScript googleMapsApiKey={apiKey} libraries={libraries}>
        <Box sx={{ display: "flex", minHeight: "100vh" }}>
          <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
            <Toolbar>
              <IconButton edge="start" color="inherit" onClick={() => setDrawerOpen(!drawerOpen)} sx={{ mr: 2 }}>
                <MenuIcon />
              </IconButton>
              
              <Typography variant="h6" noWrap>
                {user?.name}'s Bus Dashboard
              </Typography>
            </Toolbar>
          </AppBar>

          <Drawer variant="temporary" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
            <Box sx={{ width: 240, p: 2 }}>
              <Toolbar />
              <List>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>
                  Available Buses
                </Typography>
                {Object.keys(busData.routes).map((busKey) => (
                  <ListItem disablePadding key={busKey}>
                    <ListItemButton
                      selected={selectedBus === busKey}
                      onClick={() => {
                        setSelectedBus(busKey);
                        setSelectedCluster(null);
                      }}
                    >
                      <ListItemIcon>
                        <DirectionsBusIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary={busKey} 
                        secondary={
                          `${busData.routes[busKey].clusters?.reduce((sum, cluster) => 
                            sum + cluster.students.length, 0) || 0} students`
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
                <Divider sx={{ my: 2 }} />
                <ListItemButton onClick={handleLogout}>
                  <ListItemIcon><LogoutIcon /></ListItemIcon>
                  <ListItemText primary="Logout" />
                </ListItemButton>
              </List>
            </Box>
          </Drawer>

          <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
            <Toolbar />
            
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Card sx={{ p: 3, mb: 3 }}>
  <Typography variant="h6" gutterBottom>
    Fleet Statistics
  </Typography>
  <Grid container spacing={2}>
    <Grid item xs={6} md={3}>
      <Typography>Total Buses: {busData.stats.totalBusesAvailable}</Typography>
    </Grid>
    <Grid item xs={6} md={3}>
      <Typography>Buses In Use: {busData.stats.totalBusesUsed}</Typography>
    </Grid>
    <Grid item xs={6} md={3}>
      <Typography>Students Assigned: {busData.stats.studentsAssigned}</Typography>
    </Grid>
    <Grid item xs={6} md={3}>
      <Button 
        variant="contained" 
        color="secondary"
        onClick={shareWithAllStudents}
        disabled={loading}
        startIcon={loading ? <CircularProgress size={20} /> : null}
        fullWidth
        sx={{ height: '100%' }}
      >
        {loading ? "Sharing..." : "Share with All"}
      </Button>
    </Grid>
  </Grid>
</Card>

                {selectedBus && (
                  <>
                    <Card sx={{ p: 3, mb: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        {selectedBus} Route Details
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            label="Number of Stops"
                            value={orderedClusters.length}
                            disabled
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            label="Total Students"
                            value={orderedClusters.reduce((sum, cluster) => sum + cluster.students.length, 0)}
                            disabled
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            label="Actual Departure Time"
                            type="datetime-local"
                            value={busStartTime}
                            onChange={(e) => setBusStartTime(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                          />
                        </Grid>
                      </Grid>
                    </Card>

                    <Grid container spacing={3}>
                      <Grid item xs={12} md={8}>
                        <Card sx={{ p: 2, height: "100%" }}>
                          <GoogleMap
                            mapContainerStyle={mapContainerStyle}
                            center={orderedClusters[0]?.center || center}
                            zoom={12}
                          >
                            {directions[selectedBus] && (
                              <DirectionsRenderer
                                directions={directions[selectedBus]}
                                options={{
                                  polylineOptions: {
                                    strokeColor: routeColors[Object.keys(busData.routes).indexOf(selectedBus) % routeColors.length],
                                    strokeWeight: 5
                                  },
                                  suppressMarkers: false
                                }}
                              />
                            )}

                            {/* University Marker */}
                            <Marker
                              position={center}
                              label="UPES"
                              icon={{
                                url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                                scaledSize: new window.google.maps.Size(40, 40)
                              }}
                            />

                            {/* Cluster Markers */}
                            {orderedClusters.map((cluster, index) => (
                              <Marker
                                key={`stop-${index}`}
                                position={{
                                  lat: cluster.center.latitude,
                                  lng: cluster.center.longitude
                                }}
                                icon={{
                                  url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
                                  scaledSize: new window.google.maps.Size(40, 40)
                                }}
                                label={`${index + 1}`}
                              />
                            ))}

                            {/* Student Markers */}
                            {orderedClusters.flatMap((cluster, clusterIndex) =>
                              cluster.students.map((student, studentIndex) => (
                                <Marker
                                  key={`student-${clusterIndex}-${studentIndex}`}
                                  position={{ lat: student.latitude, lng: student.longitude }}
                                  onClick={() => setSelectedCluster({
                                    ...student,
                                    index: studentIndex,
                                    clusterIndex
                                  })}
                                  icon={{
                                    url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
                                    scaledSize: new window.google.maps.Size(32, 32)
                                  }}
                                  label={`${clusterIndex + 1}.${studentIndex + 1}`}
                                />
                              ))
                            )}
                          </GoogleMap>
                        </Card>
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <Card sx={{ p: 3, height: "100%" }}>
                          <Typography variant="h6" gutterBottom>
                            Route Timeline
                          </Typography>
                          {orderedClusters.map((cluster, index) => (
                            <Box 
                              key={index}
                              sx={{ 
                                mb: 2, 
                                p: 2,
                                borderRadius: 1,
                                bgcolor: 'action.selected',
                                borderLeft: `4px solid ${routeColors[index % routeColors.length]}`
                              }}
                            >
                              <Typography variant="subtitle2">
                                Stop {index + 1}
                              </Typography>
                              {estimatedTimes[index] ? (
                                <>
                                  <Typography variant="body2">
                                    <strong>ETA:</strong> {estimatedTimes[index].pickupTime}
                                  </Typography>
                                  <Typography variant="body2">
                                    <strong>Students:</strong> {cluster.students.length}
                                  </Typography>
                                </>
                              ) : (
                                <Typography variant="body2">Calculating times...</Typography>
                              )}
                            </Box>
                          ))}
                          <Box sx={{ 
                              mb: 2, 
                              p: 2,
                              borderRadius: 1,
                              bgcolor: 'background.default',
                              borderLeft: `4px solid #2196F3`
                            }}>
                              <Typography variant="subtitle2">
                                University (Destination)
                              </Typography>
                              {estimatedTimes.university ? (
                                <>
                                  <Typography variant="body2">
                                    <strong>ETA:</strong> {estimatedTimes.university.arrivalTime}
                                  </Typography>
                                  <Typography variant="body2">
                                    <strong>Travel Time from Last Stop:</strong> {estimatedTimes.university.duration}
                                  </Typography>
                                </>
                              ) : (
                                <Typography variant="body2">Calculating time...</Typography>
                              )}
                            </Box>
                        </Card>
                      </Grid>
                    </Grid>

                    <Grid container spacing={3} sx={{ mt: 1 }}>
                      <Grid item xs={12}>
                        {renderClusterInfo()}
                      </Grid>
                      <Grid item xs={12}>
                        {renderStudentList()}
                      </Grid>
                    </Grid>
                  </>
                )}
              </>
            )}
          </Box>
        </Box>
      </LoadScript>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={error ? "error" : "success"}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
};

export default BusOperatorDashboard;
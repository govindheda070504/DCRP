import React, { useState, useEffect } from "react";
import { GoogleMap, LoadScript, Marker, Autocomplete, DirectionsRenderer, TrafficLayer } from "@react-google-maps/api";
import axios from "axios";
import { Box, Grid, Card, Typography, TextField, AppBar, Toolbar, IconButton, Drawer, List, ListItem, ListItemIcon, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, Button, Snackbar, Divider, CircularProgress, Alert } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LogoutIcon from "@mui/icons-material/Logout";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import "./Sdashboard.css";

const mapContainerStyle = { width: "100%", height: "400px" };
const center = { lat: 30.41643, lng: 77.96720 };
const libraries = ["places"];
const uttarakhandBounds = {
  north: 31.5,
  south: 28.5,
  east: 81.0,
  west: 77.0,
};

const theme = createTheme({
  palette: {
    primary: { main: "#5E35B1" },
    secondary: { main: "#FFC107" },
    background: {
      default: "#F4F6F8",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#212121",
      secondary: "#757575",
    },
  },
});
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const Sdashboard = ({ user, setUser }) => {
  const [map, setMap] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [autocomplete, setAutocomplete] = useState(null);
  const [directions, setDirections] = useState(null);
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [myBusInfo, setMyBusInfo] = useState(null);
  const [busLoading, setBusLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const upesLocation = { lat: 30.41643, lng: 77.96720 };

  useEffect(() => {
    if (!user || !user.id) {
      setLoading(false);
      return;
    }

    const fetchMyBusInfo = async () => {
      try {
        setBusLoading(true);
        const response = await axios.get(
          "http://localhost:9090/api/bus-assignment/student-bus-info",
          { params: { studentId: user.id } }
        );
        setMyBusInfo(response.data);
      } catch (error) {
        console.error("Error fetching bus info:", error);
      } finally {
        setBusLoading(false);
        setLoading(false);
      }
    };

    fetchMyBusInfo();
    const interval = setInterval(fetchMyBusInfo, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const onPlaceSelected = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry) {
        const location = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };
        setUserLocation(location);
        if (map) map.panTo(location);
        fetchRoute(location);
        setConfirmOpen(true);
      }
    }
  };

  const fetchRoute = (origin) => {
    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin,
        destination: upesLocation,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK") {
          setDirections(result);
          setDistance(result.routes[0].legs[0].distance.text);
          setDuration(result.routes[0].legs[0].duration.text);
        }
      }
    );
  };

  const sendLocationToBusOperator = async () => {
    if (userLocation && user?.name) {
      try {
        await axios.post("http://localhost:9090/api/locations", {
          name: user.name,
          latitude: userLocation.lat,
          longitude: userLocation.lng,
        });
        setSnackbarMessage("Location sent successfully!");
        setSnackbarOpen(true);
      } catch (error) {
        console.error("Error sending location:", error);
        setSnackbarMessage("Error sending location. Please try again.");
        setSnackbarOpen(true);
      }
    }
  };

  const toggleDrawer = () => setDrawerOpen(!drawerOpen);
  
  const handleConfirmClose = (confirmed) => {
    setConfirmOpen(false);
    if (confirmed) sendLocationToBusOperator();
  };

  const handleSnackbarClose = () => setSnackbarOpen(false);

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login", { replace: true });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Alert severity="error">
          User not found. Please login again.
          <Button onClick={() => navigate('/login')} sx={{ ml: 2 }}>
            Go to Login
          </Button>
        </Alert>
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <LoadScript googleMapsApiKey={apiKey} libraries={libraries}>
        <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "background.default" }}>
          <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
            <Toolbar>
              <IconButton edge="start" color="inherit" onClick={toggleDrawer} sx={{ mr: 2 }}>
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" noWrap>
                Welcome, {user?.name || 'User'} ({user?.role || 'Student'})
              </Typography>
            </Toolbar>
          </AppBar>

          <Drawer variant="temporary" open={drawerOpen} onClose={toggleDrawer}>
            <Box sx={{ width: 240, backgroundColor: "background.paper" }}>
              <Toolbar />
              <List>
                <ListItem>
                  <ListItemText
                    primary={user?.name}
                    secondary={
                      <>
                        <Typography variant="body2" color="text.secondary">
                          {user?.email}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {user?.role}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
                <Divider />
                <ListItem button component="div">
                  <ListItemIcon><DashboardIcon /></ListItemIcon>
                  <ListItemText primary="Dashboard" />
                </ListItem>
                <ListItem button component="div" onClick={handleLogout}>
                  <ListItemIcon><LogoutIcon /></ListItemIcon>
                  <ListItemText primary="Logout" />
                </ListItem>
              </List>
            </Box>
          </Drawer>

          <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
            <Toolbar />
            <Typography variant="h4" sx={{ mb: 3, fontWeight: "bold", color: "text.primary" }}>
              Student Dashboard
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card sx={{ p: 3, backgroundColor: "background.paper" }}>
                  <Typography variant="h6" sx={{ mb: 2, color: "text.primary" }}>
                    Enter Your Location
                  </Typography>
                  <Autocomplete
                    onLoad={setAutocomplete}
                    onPlaceChanged={onPlaceSelected}
                    options={{ bounds: uttarakhandBounds, strictBounds: true }}
                  >
                    <TextField
          fullWidth
          label="Enter your location"
          variant="outlined"
          value={user?.permanentAddress || ""}
          onChange={(e) => setUser({ ...user, permanentAddress: e.target.value })} 
        />
                  </Autocomplete>
                  <TextField
                    fullWidth
                    label="Destination"
                    value="UPES Bidholi via Premnagar"
                    variant="outlined"
                    sx={{ mt: 2 }}
                    InputProps={{ readOnly: true }}
                  />
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card sx={{ p: 3, backgroundColor: "background.paper" }}>
                  <Typography variant="h6" sx={{ mb: 2, color: "text.primary" }}>
                    Route Information
                  </Typography>
                  {distance && duration && (
                    <Box>
                      <Typography color="text.primary"><strong>Distance:</strong> {distance}</Typography>
                      <Typography color="text.primary"><strong>Time:</strong> {duration}</Typography>
                    </Box>
                  )}
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card sx={{ p: 3, backgroundColor: "background.paper" }}>
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={userLocation || center}
                    zoom={12}
                    onLoad={setMap}
                    options={{ restriction: { latLngBounds: uttarakhandBounds, strictBounds: true } }}
                  >
                    {userLocation && <Marker position={userLocation} />}
                    <Marker position={upesLocation} label="UPES" />
                    {directions && <DirectionsRenderer directions={directions} />}
                    <TrafficLayer />
                  </GoogleMap>
                </Card>
              </Grid>
            </Grid>

            {busLoading ? (
              <CircularProgress sx={{ mt: 3 }} />
            ) : myBusInfo ? (
              <Card sx={{ p: 3, mt: 3, borderLeft: `4px solid ${myBusInfo.routeColor}` }}>
                <Typography variant="h6" gutterBottom>
                  Your Bus Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography><strong>Bus Number:</strong> {myBusInfo.busNumber}</Typography>
                    <Typography><strong>Pickup Time:</strong> {myBusInfo.pickupTime}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography><strong>Pickup Location:</strong></Typography>
                    <Typography>
                      {myBusInfo.pickupPoint.latitude.toFixed(6)}, {myBusInfo.pickupPoint.longitude.toFixed(6)}
                    </Typography>
                  </Grid>
                </Grid>
              </Card>
            ) : (
              <Alert severity="info" sx={{ mt: 3 }}>
                No bus assignment information available yet
              </Alert>
            )}
          </Box>
        </Box>
      </LoadScript>

      <Dialog open={confirmOpen} onClose={() => handleConfirmClose(false)}>
        <DialogTitle>Confirm Location</DialogTitle>
        <DialogContent>
          <Typography>
            Is this your current location? ({userLocation?.lat}, {userLocation?.lng})
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleConfirmClose(false)}>Cancel</Button>
          <Button onClick={() => handleConfirmClose(true)}>Confirm</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
      />
    </ThemeProvider>
  );
};

export default Sdashboard;
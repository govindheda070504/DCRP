
import React, { useState, useRef } from "react";
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Card,
  Fade,
  Grow
} from "@mui/material";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { LoadScript, StandaloneSearchBox } from "@react-google-maps/api";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import "./Register.css";

const libraries = ["places"];
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { 
      main: "#8b5cf6",  
      light: "#a78bfa", 
      dark: "#7c3aed"   
    },
    secondary: { 
      main: "#10b981",  
      light: "#34d399", 
      dark: "#059669"   
    },
    background: { 
      default: "#1f2937", 
      paper: "#1e293b"    
    },
    text: { 
      primary: "#f9fafb", 
      secondary: "#9ca3af" 
    },
    error: {
      main: "#ef4444" 
    }
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
    h5: {
      fontWeight: 700,
      letterSpacing: "-0.025em"
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
      letterSpacing: "0.025em"
    }
  },
  components: {
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '0.375rem',
            transition: 'all 0.2s ease-in-out',
            '& fieldset': {
              borderColor: '#4b5563', 
              transition: 'border-color 0.2s ease-in-out'
            },
            '&:hover fieldset': {
              borderColor: '#6b7280', 
            },
            '&.Mui-focused fieldset': {
              borderColor: '#8b5cf6', 
              borderWidth: '2px',
              boxShadow: '0 0 0 3px rgba(139, 92, 246, 0.3)'
            },
          },
          '& .MuiInputLabel-root': {
            color: '#9ca3af', 
            transition: 'all 0.2s ease-in-out'
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: '#8b5cf6' 
          }
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '0.375rem',
          padding: '0.625rem 1.25rem',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
          },
          '&:active': {
            transform: 'translateY(0)'
          }
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '0.75rem',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
          border: '2px solid #8b5cf6', 
          backgroundColor: "rgba(0, 0, 0, 0.5)", 
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 20px 25px -5px rgba(139, 92, 246, 0.3)',
            borderColor: '#7c3aed'
          }
        }
      }
    }
  }
});

const Register = () => {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNo, setPhoneNo] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");
  const [officeAddress, setOfficeAddress] = useState("");
  const [noOfBuses, setNoOfBuses] = useState(0);
  const [busNumbers, setBusNumbers] = useState([]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const permanentAddressRef = useRef(null);
  const officeAddressRef = useRef(null);

  const handleRoleSelection = (selectedRole) => {
    setRole(selectedRole);
    setStep(2);
  };

  const onPlaceSelected = (ref, setAddress) => {
    const place = ref.current.getPlaces()[0];
    if (place && place.formatted_address) {
      setAddress(place.formatted_address);
    }
  };

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const userData = {
        role,
        name,
        email,
        phoneNo,
        password,
        ...(role === "STUDENT" && { permanentAddress }),
        ...(role === "BUS_OPERATOR" && {
          officeAddress,
          noOfBuses,
          busNumbers,
        }),
      };

      const response = await axios.post("http://localhost:9090/api/user/register", userData);
      if (response.data) {
        navigate("/login");
      } else {
        setError("Registration failed");
      }
    } catch (error) {
      setError(error.response?.data?.message || "Registration failed");
    }
  };

  const handleBusNumberChange = (index, value) => {
    const updatedBusNumbers = [...busNumbers];
    updatedBusNumbers[index] = value;
    setBusNumbers(updatedBusNumbers);
  };

  return (
    <ThemeProvider theme={theme}>
      <LoadScript googleMapsApiKey={apiKey} libraries={libraries}>
        <Box 
          sx={{ 
            display: "flex", 
          justifyContent: "center", 
          alignItems: "center", 
          minHeight: "100vh", 
          backgroundColor: "background.default",
          padding: "1.5rem",
          backgroundImage: "url('/images/bg.jpg')",  
          backgroundSize: "cover",
          backgroundPosition: "center",
          position: "relative"
          }}
        >
          <Grow in={true} timeout={600}>
            <Card 
              className="card-hover"
              sx={{ 
                p: 4, 
                width: "100%", 
                maxWidth: "400px",
                position: "relative",
              zIndex: 1,
              }}
            >
              <Box 
                sx={{ 
                  textAlign: "center", 
                  mb: 4,
                  animation: "fadeIn 0.6s ease-out"
                }}
              >
                <Typography 
                  variant="h5" 
                  sx={{ 
                    fontWeight: 700, 
                    color: "text.primary",
                    mb: 1
                  }}
                >
                  Register
                </Typography>
              </Box>

              {step === 1 && (
                <Fade in={step === 1}>
                  <Box>
                    <Typography variant="body1" sx={{ mb: 3, textAlign: "center", color: "text.secondary" }}>
                      Select your role:
                    </Typography>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => handleRoleSelection("STUDENT")}
                      className="pulse"
                      sx={{
                        mb: 2,
                        py: 1.5,
                        fontWeight: 600,
                        background: "linear-gradient(to right, #8b5cf6, #a78bfa)",
                        '&:hover': {
                          background: "linear-gradient(to right, #7c3aed, #8b5cf6)"
                        }
                      }}
                    >
                      Student
                    </Button>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => handleRoleSelection("BUS_OPERATOR")}
                      className="pulse"
                      sx={{
                        py: 1.5,
                        fontWeight: 600,
                        background: "linear-gradient(to right, #8b5cf6, #a78bfa)",
                        '&:hover': {
                          background: "linear-gradient(to right, #7c3aed, #8b5cf6)"
                        }
                      }}
                    >
                      Bus Operator
                    </Button>
                  </Box>
                </Fade>
              )}

              {step === 2 && (
                <Fade in={step === 2}>
                  <Box>
                    <TextField
                      fullWidth
                      label="Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      sx={{ mb: 2 }}
                      className="input-focus-effect"
                    />
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      sx={{ mb: 2 }}
                      className="input-focus-effect"
                    />
                    <TextField
                      fullWidth
                      label="Phone No"
                      value={phoneNo}
                      onChange={(e) => setPhoneNo(e.target.value)}
                      sx={{ mb: 2 }}
                      className="input-focus-effect"
                    />

                    {role === "STUDENT" && (
                      <StandaloneSearchBox
                        onLoad={(ref) => (permanentAddressRef.current = ref)}
                        onPlacesChanged={() => onPlaceSelected(permanentAddressRef, setPermanentAddress)}
                        options={{
                          componentRestrictions: { country: "IN" },
                          types: ["geocode"],
                          bounds: new window.google.maps.LatLngBounds(
                            new window.google.maps.LatLng(30.246987, 77.947998),
                            new window.google.maps.LatLng(30.387299, 78.085579)
                          ),
                        }}
                      >
                        <TextField
                          fullWidth
                          label="Permanent Address"
                          value={permanentAddress}
                          onChange={(e) => setPermanentAddress(e.target.value)}
                          sx={{ mb: 2 }}
                          className="input-focus-effect"
                        />
                      </StandaloneSearchBox>
                    )}

                    {role === "BUS_OPERATOR" && (
                      <>
                        <StandaloneSearchBox
                          onLoad={(ref) => (officeAddressRef.current = ref)}
                          onPlacesChanged={() => onPlaceSelected(officeAddressRef, setOfficeAddress)}
                          options={{
                            componentRestrictions: { country: "IN" },
                            types: ["geocode"],
                            bounds: new window.google.maps.LatLngBounds(
                              new window.google.maps.LatLng(30.246987, 77.947998),
                              new window.google.maps.LatLng(30.387299, 78.085579)
                            ),
                          }}
                        >
                          <TextField
                            fullWidth
                            label="Office Address"
                            value={officeAddress}
                            onChange={(e) => setOfficeAddress(e.target.value)}
                            sx={{ mb: 2 }}
                            className="input-focus-effect"
                          />
                        </StandaloneSearchBox>

                        <TextField
                          fullWidth
                          label="Number of Buses"
                          type="number"
                          value={noOfBuses}
                          onChange={(e) => {
                            const num = parseInt(e.target.value, 10);
                            setNoOfBuses(num);
                            setBusNumbers(Array(num).fill(""));
                          }}
                          sx={{ mb: 2 }}
                          className="input-focus-effect"
                        />

                        {busNumbers.map((busNumber, index) => (
                          <TextField
                            key={index}
                            fullWidth
                            label={`Bus ${index + 1} Number`}
                            value={busNumber}
                            onChange={(e) => handleBusNumberChange(index, e.target.value)}
                            sx={{ mb: 2 }}
                            className="input-focus-effect"
                          />
                        ))}
                      </>
                    )}

                    <TextField
                      fullWidth
                      label="Password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      sx={{ mb: 2 }}
                      className="input-focus-effect"
                    />
                    <TextField
                      fullWidth
                      label="Confirm Password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      sx={{ mb: 3 }}
                      className="input-focus-effect"
                    />

                    <Button
                      fullWidth
                      variant="contained"
                      onClick={handleRegister}
                      className="pulse"
                      sx={{
                        py: 1.5,
                        fontWeight: 600,
                        background: "linear-gradient(to right, #8b5cf6, #a78bfa)",
                        '&:hover': {
                          background: "linear-gradient(to right, #7c3aed, #8b5cf6)"
                        }
                      }}
                    >
                      Register
                    </Button>
                    {error && (
                      <Fade in={error !== ""}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            mt: 2,
                            p: 1.5,
                            backgroundColor: "error.main",
                            color: "white",
                            borderRadius: "0.375rem",
                            textAlign: "center",
                            fontSize: "0.875rem",
                            animation: "shake 0.5s cubic-bezier(.36,.07,.19,.97)"
                          }}
                        >
                          {error}
                        </Typography>
                      </Fade>
                    )}
                                  <Box sx={{ textAlign: "center", mt: 3 }}>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Already have an account?{" "}
                  <a 
                    href="/login" 
                    style={{ color: "#8b5cf6", textDecoration: "none", fontWeight: 600 }}
                  >
                    Login
                  </a>
                </Typography>
              </Box>
                  </Box>
                </Fade>
                
              )}
            </Card>
          </Grow>
        </Box>
      </LoadScript>
    </ThemeProvider>
  );
};

export default Register;
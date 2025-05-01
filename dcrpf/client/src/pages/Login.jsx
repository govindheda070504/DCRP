import React, { useState } from "react";
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Card,
  Link, 
  CircularProgress,
  Fade,
  Grow
} from "@mui/material";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import "./Login.css";


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

const Login = ({ setUser }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const response = await axios.post("http://localhost:9090/api/user/login", {
        email,
        password,
      });

      if (response.data) {
        setUser(response.data);
        localStorage.setItem("user", JSON.stringify(response.data));
        navigate(response.data.role === "STUDENT" ? "/student" : "/operator");
      } else {
        setError("Invalid email or password");
      }
    } catch (error) {
      setError(error.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
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
                Welcome back
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: "text.secondary",
                  maxWidth: "300px",
                  mx: "auto"
                }}
              >
                Sign in to access your dashboard
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label="Email"
                variant="outlined"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                sx={{ mb: 2 }}
                className="input-focus-effect"
              />
              <TextField
                fullWidth
                label="Password"
                type="password"
                variant="outlined"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                sx={{ mb: 2 }}
                className="input-focus-effect"
              />
            </Box>

            <Button
              fullWidth
              variant="contained"
              onClick={handleLogin}
              disabled={loading}
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
              {loading ? (
                <CircularProgress size={24} sx={{ color: "white" }} />
              ) : (
                "Sign in"
              )}
            </Button>
                      <Box sx={{ textAlign: "center", mt: 1 }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Don’t have an account?{" "}
              <a 
                href="/register" 
                style={{ color: "#8b5cf6", textDecoration: "none", fontWeight: 600 }}
              >
                Register
              </a>
            </Typography>
          </Box>


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
          </Card>
        </Grow>
      </Box>
    </ThemeProvider>
  );
};

export default Login;
import React, { useState ,useEffect } from 'react';
import { View, Button, Text ,StyleSheet , TouchableOpacity ,Switch,FlatList,ActivityIndicator,ScrollView ,Linking} from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import GetLocation from 'react-native-get-location';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';

const Drawer = createDrawerNavigator();
GoogleSignin.configure({
  androidClientId:'606219189501-43kb13057oj27rtiurnn17qaic4cp6nt.apps.googleusercontent.com', 
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets', 
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'openid',
    'profile',
    'email'
  ],

});

const App = () => {
  const spreadsheetId = "1ZpwTUBUXI6xOVkHFgMfS9D9_c-uXGG_k_U0GvpoHzc0"; 
  const apiKey = "AIzaSyAgdkuHhvmTL8kE94XQFJoywv3jOF06rk0"; 
  const [userInfo, setUserInfo] = useState(null);
  const [data , setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingout, setLoadingout] = useState(false);
  // console.log("userInfo",userInfo)
  const [punchInTime, setPunchInTime] = useState(null);
  const [location, setLocation] = useState(null);
  const [punchOutTime, setPunchOutTime] = useState(null);
  const [punchInData, setPunchInData] = useState(null);
  const [locationout, setLocationout] = useState(null);
  // console.log(locationout,"locationout")
  const [successMessage, setSuccessMessage] = useState('');
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [filteredData, setFilteredData] = useState([]);
  const handleRowPress = (item) => {
    const latLongIn = item[2].split(', ').map(coord => parseFloat(coord)); 
    const lat = latLongIn[0];
    const long = latLongIn[1];
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${long}`;
    Linking.openURL(url).catch(err => console.error("Error opening maps:", err));
  };
  useEffect(() => {
    const loadPunchInData = async () => {
      const storedPunchInData = await AsyncStorage.getItem('punchInData');
      if (storedPunchInData) {
        const parsedData = JSON.parse(storedPunchInData);
        setPunchInData(parsedData); 
        setIsPunchedIn(true);       
        const { time, location } = parsedData;
        setPunchInTime(time);
        setLocation(location);
      }
    };
    loadPunchInData();
  }, []);
 useEffect(() => {
    if (userInfo) {
      const userName = userInfo.user.givenName; 
      const userRecords = data.filter(row => row[0].toLowerCase() === userName.toLowerCase()); 
      setFilteredData(userRecords);
      console.log(userRecords);
      
    } else {
      setFilteredData([]); 
    }
  }, [userInfo, data]);
  useEffect(() => {
    fetchData();
  }, []);
  const fetchData = async () => {
    try {
      const response = await axios.get(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1?key=${apiKey}`);
     
      console.log("fetch",response.data.values)
      setData(response.data.values)
    } catch (error) {
      console.error("Error fetching data from Google Sheets:", error);
      
    }
  };
  const handleToggleSwitch = () => {
    if (isPunchedIn) {
      handlePunchOut();
    } else {
      handlePunchIn();
    }
    setIsPunchedIn(!isPunchedIn);
  };
  const getCurrentTime = () => {
    const date = new Date();
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    const strMinutes = minutes < 10 ? '0' + minutes : minutes;
    const strSeconds = seconds < 10 ? '0' + seconds : seconds;
    return `${hours}:${strMinutes}:${strSeconds} ${ampm}`;
};




const handlePunchIn = async () => {
  const currentTime = getCurrentTime();
  setLoading(true);
  try {
    const location = await GetLocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
    });
    setPunchInTime(currentTime);
    setLocation(location);
    const punchData = { time: currentTime, location };
      setPunchInData(punchData);
      await AsyncStorage.setItem('punchInData', JSON.stringify(punchData));
    
  } catch (error) {
    console.warn(error.code, error.message);
  } finally {
    setLoading(false); 
  }
};

const handlePunchOut = async () => {
  const currentTime = getCurrentTime();
  setLoadingout(true);
  try {
    const location = await GetLocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
    });
    setPunchOutTime(currentTime);
    setLocationout(location);
    await AsyncStorage.removeItem('punchInData');
    setPunchInData(null);
    await sendToGoogleSheets(punchInData.time, currentTime, userInfo.user.givenName,punchInData.location, location);
  } catch (error) {
    console.warn(error.code, error.message);
  }
 finally {
  setLoadingout(false); 
}
};

const sendToGoogleSheets = async (punchInTime, punchOutTime, name, location, locationOut) => {
  console.log("location",location)
  console.log("locationOut",locationOut)
  const spreadsheetId = "1ZpwTUBUXI6xOVkHFgMfS9D9_c-uXGG_k_U0GvpoHzc0";
  const range = "Sheet1!A1"; 

  const values = [
    [
      name,
      punchInTime || "",
      location ? `${location.latitude}, ${location.longitude}` : "",
      punchOutTime || "",
      locationOut ? `${locationOut.latitude}, ${locationOut.longitude}` : ""
    ]
  ];

  const body = {
    values,
  };

  if (userInfo) {
    const accessToken = userInfo.accessToken; 

    try {
      await axios.post(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
        body,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      setSuccessMessage("Data saved successfully!"); 
      setTimeout(() => {
        setSuccessMessage(''); 
      }, 3000);
      console.log("Data sent successfully!");
      fetchData();
    } catch (error) {
      console.error("Error sending data to Google Sheets:", error);
      setSuccessMessage("Failed to save data.");
      setTimeout(() => {
        setSuccessMessage(''); 
      }, 3000);
    }
  } else {
    console.log("User not signed in.");
  }
};


  const signInWithGoogle = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens(); 
    setUserInfo({ ...userInfo, accessToken: tokens.accessToken }); 
      
    } catch (error) {
      console.error(error);
    }
  };
  const signOut = async () => {
    try {
      await GoogleSignin.signOut();
      setUserInfo(null); 
      setPunchInTime()
      setPunchInData(null);
      setLocation()
      setPunchOutTime()
      setLocationout()
      setIsPunchedIn(false);
      await AsyncStorage.removeItem('punchInData');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <NavigationContainer>
    {userInfo ? (
      <Drawer.Navigator initialRouteName="Home">
        
        <Drawer.Screen name="Home">
          {() => (
            <View style={styles.container}>
              <View style={styles.innerContainer}>
                <Text style={styles.welcomeText}>
                  Welcome, {userInfo.user.givenName}!
                </Text>
  
                <View style={styles.toggleContainer}>
                  <Text style={styles.toggleLabel}>
                    {isPunchedIn ? "Punch Out" : "Punch In"}
                  </Text>
                  <Switch
                    value={isPunchedIn}
                    onValueChange={handleToggleSwitch}
                    trackColor={{ false: "#767577", true: "#81b0ff" }}
                    thumbColor={isPunchedIn ? "#f5dd4b" : "#f4f3f4"}
                  />
                </View>
                {loading ? (
      <ActivityIndicator size="large" color="black" />
    ) : (
      <>
                {isPunchedIn && (
                  <>
                    {punchInTime && (
                      <Text style={styles.infoText}>Time: {punchInTime}</Text>
                    )}
                    {location && (
                      <Text style={styles.infoText}>
                        Location: {location.latitude}, {location.longitude}
                      </Text>
                    )}
                  </>
                )}
                </>
              )
            }
                {!isPunchedIn && (
                  <>
                   {loadingout ? (
                    <ActivityIndicator size="large" color="black" />
                  ) : (  <>
                    {punchOutTime && (
                      <Text style={styles.infoText}>Time: {punchOutTime}</Text>
                    )}
                    {locationout && (
                      <Text style={styles.infoText}>
                        Location: {locationout.latitude}, {locationout.longitude}
                      </Text>
                    )}
                  </>)}
                
                 
                  </>
                )}
  
                <Text style={styles.successText}>{successMessage}</Text>
  <View style={styles.successText}></View>
                <TouchableOpacity style={styles.button} onPress={signOut}>
                  <Text style={styles.buttonText}>Sign out</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Drawer.Screen>
        <Drawer.Screen name="Report">
          {() => (
          <View style={styles.containered}>
            <ScrollView>
          <Text style={styles.title}>Report Data for {userInfo ? userInfo.user.givenName : 'User'}</Text>
          {filteredData.length > 0 ? (
            <View style={styles.table}>
              <View style={styles.headerRow}>
                {data[0].map((header, index) => (
                  <Text key={index} style={styles.headerCell}>{header}</Text>
                ))}
              </View>
              <FlatList
              data={filteredData} 
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => handleRowPress(item)} style={styles.row}>
                  {item.map((cell, idx) => (
                    <Text key={idx} style={styles.cell}>{cell || "N/A"}</Text>
                  ))}
                </TouchableOpacity>
              )}
            />
               
               
            </View>
            
          ) : (
            <Text>No data available for {userInfo ? userInfo.user.givenName : 'this user'}</Text>
          )}
           <View style={styles.successText}></View>
           </ScrollView>
        </View>
          )}
        </Drawer.Screen>
      </Drawer.Navigator>
    ) : (
      <View style={styles.container}>
        <TouchableOpacity style={styles.button} onPress={signInWithGoogle}>
          <Text style={styles.buttonText}>Sign in with Google</Text>
        </TouchableOpacity>
      </View>
    )}
  </NavigationContainer>
  
   
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#999a9e',
  },
  successText: {
    color: 'green',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  button: {
    backgroundColor: 'white', 
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 4,
    elevation: 3, 
    alignItems: 'center',},
buttonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: 'bold',
},
  innerContainer: {
    alignItems: 'center',
  },
  toggleContainer: {
    // flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 20,
  },
  toggleLabel: {
    fontSize: 26,
    marginRight: 10,
    // marginTop:10
  },
  signInContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInContainer:{
    
    marginBottom: 100,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  table: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#999a9e',
  },
  headerCell: {
    flex: 1,
    padding: 10,
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  cell: {
    flex: 1,
    padding: 10,
    textAlign: 'center',
    backgroundColor: '#fff',
  },
  containered: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f0f0',
  },
});

export default App;
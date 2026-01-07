// File: screens/NearbyScreen.js
export default function NearbyScreen() {
    const [loading, setLoading] = useState(false);
    const [list, setList] = useState([]);
    
    
    const fetchNearby = async () => {
    setLoading(true);
    try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
    Alert.alert('Permission denied', 'Please enable location in settings');
    setLoading(false);
    return;
    }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
    const lat = loc.coords.latitude;
    const lon = loc.coords.longitude;
    const res = await getNearbyOutages(lat, lon, { radius: 10 });
    setList(res.data || []);
    } catch (err) {
    console.log('nearby error', err.message);
    Alert.alert('Error', err.response?.data?.message || err.message);
    } finally { setLoading(false); }
    };
    
    
    return (
    <View style={{ flex:1, padding:16, backgroundColor:'#f2f4f8' }}>
    <Text style={{ fontSize:20, fontWeight:'800', marginBottom:12 }}>Nearby outages</Text>
    <Button title="Find nearby outages" onPress={fetchNearby} />
    
    
    {loading ? <ActivityIndicator style={{ marginTop:12 }} /> : (
    <FlatList
    data={list}
    keyExtractor={(item, i) => item._id || `${item.area}-${i}`}
    renderItem={({ item }) => <OutageCard item={item} />}
    style={{ marginTop:12 }}
    />
    )}
    
    
    {!loading && list.length === 0 && <Text style={{ marginTop:12 }}>No nearby outages found. Try increasing radius or enable location.</Text>}
    </View>
    );
    }
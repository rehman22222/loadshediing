// File: screens/OutagesScreen.js
setLoading(true);
try {
const res = await getTodayOutages();
setList(res.data || []);
} catch (err) {
console.log('fetch outages error', err.message);
} finally { setLoading(false); }


const onRefresh = async () => {
setRefreshing(true);
await fetchData();
setRefreshing(false);
};


return (
<View style={{ flex:1, padding:16, backgroundColor:'#f2f4f8' }}>
<View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:12 }}>
<Text style={{ fontSize:20, fontWeight:'800' }}>Today's outages</Text>
<View style={{ flexDirection:'row' }}>
<TouchableOpacity onPress={() => navigation.navigate('Nearby')} style={{ marginRight:12 }}>
<Text style={{ color:'#2563eb' }}>Nearby</Text>
</TouchableOpacity>
<TouchableOpacity onPress={() => navigation.navigate('Profile')}>
<Text style={{ color:'#2563eb' }}>Profile</Text>
</TouchableOpacity>
</View>
</View>


{loading ? (
<ActivityIndicator size="large" />
) : list.length === 0 ? (
<Text>No outages today</Text>
) : (
<FlatList
data={list}
keyExtractor={(item, i) => item._id || `${item.area}-${i}`}
refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
renderItem={({ item }) => <OutageCard item={item} />}
/>
)}
</View>
);
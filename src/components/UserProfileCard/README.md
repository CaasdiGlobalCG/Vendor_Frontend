# UserProfileCard Component

This component displays a user's profile information in a card format. It can be used in two ways:

1. By passing profile data directly to the component
2. By passing a vendorId to have the component fetch the data from the backend

## Usage with Direct Data

```jsx
import UserProfileCard from '../../components/UserProfileCard/UserProfileCard';

// In your component:
const [profileData, setProfileData] = useState({
  name: "John Doe",
  vendorId: "V12345",
  companyName: "ABC Corp",
  phone: "+1 123-456-7890",
  location: "New York, USA",
  email: "john@example.com",
  image: "https://example.com/profile.jpg"
});
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

// In your render function:
<UserProfileCard
  profileData={profileData}
  loading={loading}
  error={error}
  onEditProfileClick={() => handleEditProfile()}
/>
```

## Usage with VendorId (Auto-Fetching)

```jsx
import UserProfileCard from '../../components/UserProfileCard/UserProfileCard';

// In your component:
const vendorId = "V12345"; // Get this from your context, props, or params

// In your render function:
<UserProfileCard
  vendorId={vendorId}
  onEditProfileClick={() => handleEditProfile()}
/>
```

The component will automatically fetch the vendor data from the backend using the provided vendorId.

## Props

| Prop Name | Type | Description |
|-----------|------|-------------|
| profileData | Object | Direct profile data (optional if vendorId is provided) |
| loading | Boolean | External loading state (optional) |
| error | String/Object | External error state (optional) |
| onEditProfileClick | Function | Handler for the Edit Profile button |
| BuildingIconComponent | Component | Custom building icon component (optional) |
| vendorId | String | Vendor ID to fetch data from backend |

## Implementation in Pages

### Home.jsx, UserProject.jsx, UserProduct.jsx

You can update each page to either:

1. Continue passing profile data directly (as before)
2. Pass the vendorId instead and let the component handle the data fetching

Example modification for a page:

```jsx
// Before
<UserProfileCard
  profileData={profileData}
  loading={loading}
  error={error}
  onEditProfileClick={handleProfileEditClick}
/>

// After - using vendorId
<UserProfileCard
  vendorId={currentUser?.vendorId} // Get from your context
  onEditProfileClick={handleProfileEditClick}
/>
```

This approach simplifies your pages by removing the need to fetch and format profile data in each page that uses the UserProfileCard component. 
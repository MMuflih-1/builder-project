import { useState } from 'react';

const API_URL = 'https://iw7dv4kkca.execute-api.us-east-2.amazonaws.com/prod';

interface DogFormData {
  shelter: string;
  city: string;
  state: string;
  dogName: string;
  species: string;
  description: string;
  birthday: string;
  weight: string;
  color: string;
}

export default function AddDog() {
  const [formData, setFormData] = useState<DogFormData>({
    shelter: '',
    city: '',
    state: '',
    dogName: '',
    species: 'Labrador Retriever',
    description: '',
    birthday: '',
    weight: '',
    color: ''
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileSelect = (file: File) => {
    if (file && (file.type === 'image/jpeg' || file.type === 'image/jpg' || file.type === 'image/png')) {
      setSelectedFile(file);
      setMessage('');
    } else {
      setMessage('Please select a valid image file (JPEG or PNG)');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const uploadImage = async (dogId: string) => {
    if (!selectedFile) return;

    try {
      // Get upload URL
      const uploadResponse = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dogId: dogId,
          fileName: selectedFile.name,
          fileType: selectedFile.type,
        }),
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl } = await uploadResponse.json();

      // Upload file to S3
      const fileUploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': selectedFile.type,
        },
        body: selectedFile,
      });

      if (!fileUploadResponse.ok) {
        throw new Error('Failed to upload image');
      }

      return true;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const generateImage = async () => {
    if (!imagePrompt.trim()) {
      setMessage('Please enter a description for the image');
      return;
    }

    setGeneratingImage(true);
    setMessage('');

    try {
      const response = await fetch(`${API_URL}/generate-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: imagePrompt
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate image');
      }

      const { imageUrl } = await response.json();
      setGeneratedImageUrl(imageUrl);
      
      // Convert the generated image URL to a File object
      const imageResponse = await fetch(imageUrl);
      const imageBlob = await imageResponse.blob();
      const imageFile = new File([imageBlob], 'generated-dog-image.png', { type: 'image/png' });
      setSelectedFile(imageFile);
      
      setMessage('Image generated successfully!');
    } catch (error: any) {
      setMessage(`Error generating image: ${error.message}`);
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Validate required fields
      const requiredFields = ['shelter', 'city', 'state', 'dogName', 'description', 'birthday', 'weight', 'color'];
      for (const field of requiredFields) {
        if (!formData[field as keyof DogFormData]) {
          setMessage(`Please fill in the ${field} field`);
          setLoading(false);
          return;
        }
      }
      
      // Validate image if provided
      if (selectedFile) {
        setMessage('Validating image...');
        
        // Convert file to base64
        const fileReader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          fileReader.onload = () => {
            const result = fileReader.result as string;
            const base64 = result.split(',')[1]; // Remove data:image/jpeg;base64, prefix
            resolve(base64);
          };
          fileReader.onerror = reject;
        });
        
        fileReader.readAsDataURL(selectedFile);
        const imageBase64 = await base64Promise;
        
        // Validate image with Rekognition
        const validateResponse = await fetch(`${API_URL}/validate-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageBase64 }),
        });
        
        if (!validateResponse.ok) {
          const errorData = await validateResponse.json();
          setMessage(errorData.error || 'Image validation failed');
          setLoading(false);
          return;
        }
        
        setMessage('Image validated successfully. Creating dog...');
      }

      // Create dog
      const currentUser = localStorage.getItem('currentUserEmail') || 'test7'; // Use username
      console.log('Creating dog with user:', currentUser);
      const dogResponse = await fetch(`${API_URL}/dogs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          name: formData.dogName, // Send dogName as name to backend
          createdBy: currentUser
        }),
      });

      if (!dogResponse.ok) {
        const errorData = await dogResponse.json();
        throw new Error(errorData.error || 'Failed to create dog');
      }

      const { dogId } = await dogResponse.json();

      // Upload image if selected
      if (selectedFile) {
        await uploadImage(dogId);
        setMessage('Dog and image uploaded successfully! The image will be processed shortly.');
      } else {
        setMessage('Dog uploaded successfully!');
      }

      // Reset form
      setFormData({
        shelter: '',
        city: '',
        state: '',
        dogName: '',
        species: 'Labrador Retriever',
        description: '',
        birthday: '',
        weight: '',
        color: ''
      });
      setSelectedFile(null);
      setGeneratedImageUrl(null);
      setImagePrompt('');

    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Add New Dog for Adoption</h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        {/* Shelter Information */}
        <div>
          <label>Shelter Name *</label>
          <input
            type="text"
            name="shelter"
            value={formData.shelter}
            onChange={handleInputChange}
            placeholder="e.g., Happy Paws Rescue"
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            required
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <label>City *</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              placeholder="e.g., Charlotte"
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              required
            />
          </div>
          <div style={{ flex: 1 }}>
            <label>State *</label>
            <select
              name="state"
              value={formData.state}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              required
            >
              <option value="">Select State</option>
              <option value="AL">Alabama</option>
              <option value="AK">Alaska</option>
              <option value="AZ">Arizona</option>
              <option value="AR">Arkansas</option>
              <option value="CA">California</option>
              <option value="CO">Colorado</option>
              <option value="CT">Connecticut</option>
              <option value="DE">Delaware</option>
              <option value="FL">Florida</option>
              <option value="GA">Georgia</option>
              <option value="HI">Hawaii</option>
              <option value="ID">Idaho</option>
              <option value="IL">Illinois</option>
              <option value="IN">Indiana</option>
              <option value="IA">Iowa</option>
              <option value="KS">Kansas</option>
              <option value="KY">Kentucky</option>
              <option value="LA">Louisiana</option>
              <option value="ME">Maine</option>
              <option value="MD">Maryland</option>
              <option value="MA">Massachusetts</option>
              <option value="MI">Michigan</option>
              <option value="MN">Minnesota</option>
              <option value="MS">Mississippi</option>
              <option value="MO">Missouri</option>
              <option value="MT">Montana</option>
              <option value="NE">Nebraska</option>
              <option value="NV">Nevada</option>
              <option value="NH">New Hampshire</option>
              <option value="NJ">New Jersey</option>
              <option value="NM">New Mexico</option>
              <option value="NY">New York</option>
              <option value="NC">North Carolina</option>
              <option value="ND">North Dakota</option>
              <option value="OH">Ohio</option>
              <option value="OK">Oklahoma</option>
              <option value="OR">Oregon</option>
              <option value="PA">Pennsylvania</option>
              <option value="RI">Rhode Island</option>
              <option value="SC">South Carolina</option>
              <option value="SD">South Dakota</option>
              <option value="TN">Tennessee</option>
              <option value="TX">Texas</option>
              <option value="UT">Utah</option>
              <option value="VT">Vermont</option>
              <option value="VA">Virginia</option>
              <option value="WA">Washington</option>
              <option value="WV">West Virginia</option>
              <option value="WI">Wisconsin</option>
              <option value="WY">Wyoming</option>
            </select>
          </div>
        </div>

        {/* Dog Information */}
        <div>
          <label>Dog Name *</label>
          <input
            type="text"
            name="dogName"
            value={formData.dogName || ''}
            onChange={handleInputChange}
            placeholder="e.g., Buddy, Max, Luna"
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            required
          />
        </div>

        <div>
          <label>Species *</label>
          <select
            name="species"
            value={formData.species}
            onChange={handleInputChange}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            required
          >
            <option value="Labrador Retriever">Labrador Retriever</option>
          </select>
          <small style={{ color: '#666' }}>Only Labrador Retrievers are accepted</small>
        </div>

        <div>
          <label>Description *</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="e.g., Friendly dog, great with kids, loves to play fetch"
            style={{ width: '100%', padding: '8px', marginTop: '5px', minHeight: '80px' }}
            required
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <label>Birthday *</label>
            <input
              type="date"
              name="birthday"
              value={formData.birthday}
              onChange={handleInputChange}
              max={new Date().toISOString().split('T')[0]}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              required
            />
          </div>
          <div style={{ flex: 1 }}>
            <label>Weight (lbs) *</label>
            <input
              type="number"
              name="weight"
              value={formData.weight}
              onChange={handleInputChange}
              placeholder="e.g., 32"
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              required
            />
          </div>
        </div>

        <div>
          <label>Color *</label>
          <input
            type="text"
            name="color"
            value={formData.color}
            onChange={handleInputChange}
            placeholder="e.g., Brown, Yellow, Black"
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            required
          />
        </div>

        {/* AI Image Generation */}
        <div>
          <label>Generate AI Image</label>
          <div style={{ marginTop: '5px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f8f9fa' }}>
            <input
              type="text"
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="Describe the dog image you want to generate (e.g., 'A friendly golden labrador retriever sitting in a park')"
              style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
            />
            <button
              type="button"
              onClick={generateImage}
              disabled={generatingImage || !imagePrompt.trim()}
              style={{
                backgroundColor: generatingImage ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: generatingImage ? 'not-allowed' : 'pointer'
              }}
            >
              {generatingImage ? 'Generating...' : '🎨 Generate Image'}
            </button>
          </div>
        </div>

        {/* Image Upload */}
        <div>
          <label>Dog Photo {generatedImageUrl ? '(Generated)' : '(Upload)'}</label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragOver ? '#007bff' : '#ddd'}`,
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center',
              marginTop: '5px',
              backgroundColor: dragOver ? '#f8f9fa' : 'white',
              cursor: 'pointer'
            }}
          >
            {selectedFile ? (
              <div>
                <p>Selected: {selectedFile.name}</p>
                <img 
                  src={generatedImageUrl || URL.createObjectURL(selectedFile)} 
                  alt="Preview" 
                  style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'cover' }}
                />
                {generatedImageUrl && (
                  <p style={{ color: '#28a745', fontSize: '12px', marginTop: '5px' }}>✨ AI Generated Image</p>
                )}
              </div>
            ) : (
              <div>
                <p>Drag & drop an image here, or click to select</p>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleFileChange}
                  style={{ marginTop: '10px' }}
                />
              </div>
            )}
          </div>
        </div>

        {message && (
          <div style={{ 
            padding: '10px', 
            borderRadius: '4px', 
            backgroundColor: (message.includes('Error') || message.includes('Only dogs are accepted') || message.includes('Only Labrador Retrievers are accepted') || message.includes('Please upload an image of a dog')) ? '#f8d7da' : '#d4edda',
            color: (message.includes('Error') || message.includes('Only dogs are accepted') || message.includes('Only Labrador Retrievers are accepted') || message.includes('Please upload an image of a dog')) ? '#721c24' : '#155724',
            border: `1px solid ${(message.includes('Error') || message.includes('Only dogs are accepted') || message.includes('Only Labrador Retrievers are accepted') || message.includes('Please upload an image of a dog')) ? '#f5c6cb' : '#c3e6cb'}`
          }}>
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            backgroundColor: loading ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px'
          }}
        >
          {loading ? 'Uploading...' : 'Add Dog'}
        </button>
      </form>
    </div>
  );
}
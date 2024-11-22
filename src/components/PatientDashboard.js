import React, { useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import LabChart from './LabChart';
import '../ToggleSwitch.css';

// Keep the REFERENCE_RANGES constant
const REFERENCE_RANGES = {
  'Hemoglobin': { low: 12.0, high: 17.5 }, // g/dL
  'RBC Count': { low: 4.1, high: 5.9 },    // million cells/µL
  'WBC Count': { low: 4.0, high: 11.0 },   // x10^3/µL
  'Platelet Count': { low: 150, high: 450 }, // x10^3/µL
  'Hematocrit': { low: 36, high: 53 },     // %
  'Glucose': { low: 70, high: 99 },        // mg/dL (fasting)
  'Creatinine': { low: 0.59, high: 1.35 }, // mg/dL
  'BUN': { low: 7, high: 20 },             // mg/dL
  'Cholesterol': { low: 50, high: 200 },    // mg/dL (desirable total cholesterol)
  'HDL Cholesterol': { low: 40, high: 60 } // mg/dL (higher is generally better)
};


// Add this helper function to get the folder name in the correct format
const getFolderName = (firstName, lastName) => 
  `${firstName.toLowerCase()}_${lastName.toLowerCase()}`;

// Get list of available patients from data folder structure
const AVAILABLE_PATIENTS = (() => {
  const context = require.context('../data/', true, /^\.\/[^/]+$/);
  return context.keys().map(key => {
    // Extract folder name and split into first/last name
    const folderName = key.replace('./', '');
    const [firstName, lastName] = folderName.split('_').map(name => 
      name.charAt(0).toUpperCase() + name.slice(1)
    );
    return { firstName, lastName };
  });
})();

// Add this function before the PatientDashboard component
const findLabTest = (text) => {
  return Object.keys(REFERENCE_RANGES).find(testName => 
    text === testName
  );
};

const formatBoldText = (text, handleLabClick) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const content = part.slice(2, -2);
      
      if (content.includes(' and ')) {
        const labNames = content.split(' and ').map(name => name.trim());
        return (
          <strong key={index}>
            {labNames.map((name, nameIndex) => {
              const isLabTest = findLabTest(name);
              return (
                <React.Fragment key={nameIndex}>
                  {isLabTest ? (
                    <span
                      onClick={() => handleLabClick(name)}
                      style={styles.clickableText}
                    >
                      {name}
                    </span>
                  ) : (
                    name
                  )}
                  {nameIndex < labNames.length - 1 ? ' and ' : ''}
                </React.Fragment>
              );
            })}
          </strong>
        );
      }
      
      const isLabTest = findLabTest(content);
      if (isLabTest) {
        return (
          <strong 
            key={index}
            onClick={() => handleLabClick(content)}
            style={styles.clickableText}
          >
            {content}
          </strong>
        );
      }
      return <strong key={index}>{content}</strong>;
    }
    return part;
  });
};

const formatAnalysis = (text, handleLabClick) => {
  const extractSection = (text, startMarker, endMarker) => {
    const start = text.indexOf(startMarker);
    const end = text.indexOf(endMarker);
    if (start === -1 || end === -1) return '';
    return text.substring(start + startMarker.length, end).trim() || 'No information available.';
  };

  const sections = {
    abnormalResults: extractSection(text, '[ABNORMAL_RESULTS_START]', '[ABNORMAL_RESULTS_END]'),
    trends: extractSection(text, '[TRENDS_START]', '[TRENDS_END]'),
    implications: extractSection(text, '[IMPLICATIONS_START]', '[IMPLICATIONS_END]'),
    recommendations: extractSection(text, '[RECOMMENDATIONS_START]', '[RECOMMENDATIONS_END]')
  };

  const formatContentLines = (content) => {
    if (!content || content === 'No information available.') {
      return <p style={styles.noData}>No information available.</p>;
    }

    const lines = content.split('\n');
    return lines.map((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return null;

      if (trimmedLine.startsWith('**')) {
        return (
          <li key={index} style={styles.primaryBullet}>
            {formatBoldText(trimmedLine, handleLabClick)}
          </li>
        );
      }

      if (trimmedLine.startsWith('-') || trimmedLine.startsWith('•')) {
        return (
          <li key={index} style={styles.secondaryBullet}>
            {formatBoldText(trimmedLine.replace(/^[-•]/, '').trim(), handleLabClick)}
          </li>
        );
      }

      return (
        <p key={index} style={styles.paragraph}>
          {formatBoldText(trimmedLine, handleLabClick)}
        </p>
      );
    }).filter(Boolean);
  };

  return (
    <div style={styles.analysisContent}>
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Abnormal Results</h4>
        <div style={styles.sectionContent}>
          {formatContentLines(sections.abnormalResults)}
        </div>
      </div>

      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Trends</h4>
        <div style={styles.sectionContent}>
          {formatContentLines(sections.trends)}
        </div>
      </div>

      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Implications</h4>
        <div style={styles.sectionContent}>
          {formatContentLines(sections.implications)}
        </div>
      </div>

      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Recommendations</h4>
        <div style={styles.sectionContent}>
          {formatContentLines(sections.recommendations)}
        </div>
      </div>
    </div>
  );
};

const PatientDashboard = () => {
  const [patientData, setPatientData] = useState(null);
  const [labData, setLabData] = useState([]);
  const [error, setError] = useState(null);
  const [currentTest, setCurrentTest] = useState(null);
  const { firstName, lastName } = useParams();
  const [showReferenceLines, setShowReferenceLines] = useState(true);
  const [chartKey, setChartKey] = useState(0);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [isUsingCache, setIsUsingCache] = useState(false);
  const [isCacheCleared, setIsCacheCleared] = useState(false);
  const [allPatients, setAllPatients] = useState([]);
  const [currentPatientIndex, setCurrentPatientIndex] = useState(0);
  const history = useHistory();

  useEffect(() => {
    const loadPatientData = async () => {
      try {
        const folderName = getFolderName(firstName, lastName);
        
        // Update the import paths to use absolute paths from src
        const [patientModule, labModule, aiModule] = await Promise.all([
          import(`/src/data/${folderName}/patient_data.json`),
          import(`/src/data/${folderName}/lab_data.json`),
          import(`/src/data/${folderName}/ai_analysis.json`)
        ]);

        setPatientData(patientModule.default);

        const formattedLabData = labModule.default.map(entry => ({
          date: entry.date,
          value: entry.value,
          test: entry.test,
          referenceRange: entry.referenceRange
        }));

        setLabData(formattedLabData);
        setAiAnalysis(aiModule.default.analysis);

        // Find current patient index
        const currentIndex = AVAILABLE_PATIENTS.findIndex(
          p => p.firstName.toLowerCase() === firstName.toLowerCase() && 
               p.lastName.toLowerCase() === lastName.toLowerCase()
        );
        if (currentIndex !== -1) {
          setCurrentPatientIndex(currentIndex);
        }

        // Set initial test
        if (formattedLabData.length > 0) {
          const uniqueTests = [...new Set(formattedLabData.map(data => data.test))];
          setCurrentTest(uniqueTests[0]);
        }
      } catch (err) {
        console.error('Error:', err);
        setError(err.message);
      }
    };

    if (firstName && lastName) {
      loadPatientData();
    }
  }, [firstName, lastName]);

  // Modify the generateAnalysis function to use local JSON
  const generateAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setIsUsingCache(false);
    
    try {
      const folderName = getFolderName(firstName, lastName);
      const aiModule = await import(`/src/data/${folderName}/ai_analysis.json`);
      setAiAnalysis(aiModule.default.analysis);
      setIsUsingCache(false);
    } catch (err) {
      console.error('Analysis error:', err);
      setAnalysisError(`Failed to load analysis: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const uniqueTests = [...new Set(labData.map(data => data.test))];

  const handleTestClick = (test) => {
    console.log('Changing current test to:', test);
    setCurrentTest(test);
    setChartKey(prevKey => prevKey + 1);
  };

  const handleToggleReferenceLines = () => {
    setShowReferenceLines(prevState => !prevState);
    setChartKey(prevKey => prevKey + 1);
  };

  // Add this handler function
  const handleClearCache = () => {
    setIsCacheCleared(true);
    setIsUsingCache(false);
    setAiAnalysis(''); // Clear current analysis
    
    // Reset the "Cache Cleared" message after 3 seconds
    setTimeout(() => {
      setIsCacheCleared(false);
    }, 3000);
  };

  // Add function to handle patient cycling
  const handleCyclePatient = () => {
    const nextIndex = (currentPatientIndex + 1) % AVAILABLE_PATIENTS.length;
    const nextPatient = AVAILABLE_PATIENTS[nextIndex];
    history.push(`/patient-dashboard/${nextPatient.firstName}/${nextPatient.lastName}`);
    setCurrentPatientIndex(nextIndex);
  };

  if (error) return <div style={styles.error}>Error: {error}</div>;
  if (!patientData) return <div style={styles.loading}>Loading...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <h3 style={styles.sidebarTitle}>Available Tests</h3>
        <ul style={styles.testList}>
          {uniqueTests.map((test, index) => (
            <li 
              key={index} 
              onClick={() => handleTestClick(test)}
              style={{
                ...styles.testItem,
                ...(currentTest === test ? styles.activeTest : {})
              }}
            >
              {test}
            </li>
          ))}
        </ul>
      </div>
      <div style={styles.mainContent}>
        <div style={styles.headerContainer}>
          <h1 style={styles.title}>Patient Dashboard</h1>
          <button 
            onClick={handleCyclePatient}
            style={styles.cycleButton}
          >
            Next Patient
          </button>
        </div>
        <div style={styles.patientInfo}>
          <h2 style={styles.patientName}>{patientData.name[0].given.join(' ')} {patientData.name[0].family}</h2>
          <p style={styles.patientDOB}>DOB: {patientData.birthDate}</p>
        </div>
        {currentTest && (
          <div style={styles.chartContainer}>
            <h3 style={styles.currentTestTitle}>Current Test: {currentTest}</h3>
            <div style={styles.toggleContainer}>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={showReferenceLines}
                  onChange={handleToggleReferenceLines}
                />
                <span className="toggle-slider"></span>
              </label>
              <span style={styles.toggleText}>Show Reference Lines</span>
            </div>
            <LabChart 
              key={chartKey}
              labData={labData.filter(data => data.test === currentTest)}
              referenceRange={REFERENCE_RANGES[currentTest]}
              showReferenceLines={showReferenceLines}
            />
            
            <div style={styles.aiSection}>
              <div style={styles.buttonContainer}>
                <button 
                  onClick={generateAnalysis} 
                  disabled={isAnalyzing}
                  style={styles.analyzeButton}
                >
                  {isAnalyzing ? 'Analyzing...' : 'Analyze Lab Results'}
                </button>
                <button
                  onClick={handleClearCache}
                  style={styles.clearCacheButton}
                  title="Clear all cached analyses"
                >
                  Clear Cache
                </button>
              </div>
              
              {isCacheCleared && (
                <div style={styles.successMessage}>Cache cleared successfully!</div>
              )}
              
              {analysisError && (
                <div style={styles.error}>{analysisError}</div>
              )}
              
              {aiAnalysis && (
                <div style={styles.analysisContainer}>
                  <h3 style={styles.analysisTitle}>
                    AI Analysis 
                    {isUsingCache && (
                      <span style={styles.cachedBadge}>Cached</span>
                    )}
                  </h3>
                  {formatAnalysis(aiAnalysis, handleTestClick)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f0f2f5',
  },
  sidebar: {
    width: '250px',
    padding: '20px',
    backgroundColor: '#ffffff',
    boxShadow: '2px 0 5px rgba(0,0,0,0.1)',
  },
  sidebarTitle: {
    fontSize: '18px',
    marginBottom: '15px',
    color: '#333',
  },
  testList: {
    listStyleType: 'none',
    padding: 0,
  },
  testItem: {
    cursor: 'pointer',
    padding: '10px',
    margin: '5px 0',
    borderRadius: '5px',
    transition: 'background-color 0.3s',
  },
  activeTest: {
    backgroundColor: '#e0e0e0',
    fontWeight: 'bold',
  },
  mainContent: {
    flex: 1,
    padding: '30px',
  },
  title: {
    fontSize: '28px',
    marginBottom: '20px',
    color: '#333',
  },
  patientInfo: {
    backgroundColor: '#ffffff',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  patientName: {
    fontSize: '24px',
    marginBottom: '10px',
    color: '#2c3e50',
  },
  patientDOB: {
    fontSize: '16px',
    color: '#7f8c8d',
  },
  chartContainer: {
    backgroundColor: '#ffffff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  currentTestTitle: {
    fontSize: '20px',
    marginBottom: '15px',
    color: '#2c3e50',
  },
  error: {
    color: '#e74c3c',
    fontSize: '18px',
    textAlign: 'center',
    marginTop: '50px',
  },
  loading: {
    fontSize: '18px',
    textAlign: 'center',
    marginTop: '50px',
    color: '#3498db',
  },
  toggleContainer: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '15px',
  },
  toggleLabel: {
    position: 'relative',
    display: 'inline-block',
    width: '60px',
    height: '34px',
  },
  toggleInput: {
    opacity: 0,
    width: 0,
    height: 0,
  },
  toggleSlider: {
    position: 'absolute',
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ccc',
    transition: '.4s',
    borderRadius: '34px',
    '&::before': {
      position: 'absolute',
      content: '""',
      height: '26px',
      width: '26px',
      left: '4px',
      bottom: '4px',
      backgroundColor: 'white',
      transition: '.4s',
      borderRadius: '50%',
    },
  },
  toggleText: {
    marginLeft: '10px',
  },
  aiSection: {
    marginTop: '20px',
    padding: '20px',
    borderTop: '1px solid #e0e0e0',
  },
  analyzeButton: {
    backgroundColor: '#2196F3',
    color: 'white',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'background-color 0.3s',
    '&:hover': {
      backgroundColor: '#1976D2',
    },
    '&:disabled': {
      backgroundColor: '#90CAF9',
      cursor: 'not-allowed',
    },
  },
  analysisContainer: {
    marginTop: '20px',
    backgroundColor: '#ffffff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  analysisTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: '15px',
    display: 'flex',
    alignItems: 'center',
  },
  analysisContent: {
    color: '#34495e',
    fontSize: '14px',
    whiteSpace: 'pre-line', // This helps preserve line breaks
  },
  cachedBadge: {
    fontSize: '12px',
    backgroundColor: '#e0e0e0',
    color: '#666',
    padding: '2px 6px',
    borderRadius: '4px',
    marginLeft: '10px',
    verticalAlign: 'middle',
  },
  section: {
    marginBottom: '1.5em',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: '1em',
    paddingBottom: '0.5em',
    borderBottom: '1px solid #eee',
  },
  sectionContent: {
    marginLeft: '15px',
  },
  bulletPoint: {
    marginLeft: '20px',
    marginBottom: '0.5em',
    listStyleType: 'disc',
  },
  subSection: {
    marginBottom: '8px',
  },
  paragraph: {
    marginBottom: '1em',
    lineHeight: '1.6',
  },
  clickableText: {
    cursor: 'pointer',
    color: '#2196F3',
    fontWeight: 'bold',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  primaryBullet: {
    marginLeft: '20px',
    marginBottom: '0.8em',
    listStyleType: 'disc',
    lineHeight: '1.4',
  },
  secondaryBullet: {
    marginLeft: '40px',
    marginBottom: '0.6em',
    listStyleType: 'circle',
    lineHeight: '1.4',
  },
  buttonContainer: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    marginBottom: '15px',
  },
  clearCacheButton: {
    backgroundColor: '#dc3545',
    color: 'white',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'background-color 0.3s',
    '&:hover': {
      backgroundColor: '#c82333',
    },
  },
  successMessage: {
    color: '#28a745',
    backgroundColor: '#d4edda',
    padding: '10px',
    borderRadius: '4px',
    marginBottom: '15px',
    fontSize: '14px',
  },
  noData: {
    color: '#666',
    fontStyle: 'italic',
    marginBottom: '1em',
  },
  headerContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '20px',
  },
  cycleButton: {
    padding: '8px 16px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'background-color 0.3s',
    '&:hover': {
      backgroundColor: '#1976D2',
    },
  },
};

export default PatientDashboard;

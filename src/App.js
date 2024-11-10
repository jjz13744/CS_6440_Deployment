import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import PatientDashboard from './components/PatientDashboard';

function App() {
  return (
    <Router basename="/{repository-name}">
      <div className="App">
        <Switch>
          <Route path="/patient-dashboard/:firstName/:lastName" component={PatientDashboard} />
        </Switch>
      </div>
    </Router>
  );
}

export default App;

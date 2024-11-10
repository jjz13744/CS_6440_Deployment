import React from 'react';
import { HashRouter as Router, Route, Switch } from 'react-router-dom';
import PatientDashboard from './components/PatientDashboard';

function App() {
  return (
    <Router>
      <div className="App">
        <Switch>
          <Route path="/patient-dashboard/:firstName/:lastName" component={PatientDashboard} />
        </Switch>
      </div>
    </Router>
  );
}

export default App;

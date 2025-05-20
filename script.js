class SportsAnalyzer {
    constructor() {
        this.initializeEventListeners();
        this.updateTeamLabels();
        this.charts = {};
        this.simulationResults = null;
        this.matchHistory = {
            h2h: [],
            team1: [],
            team2: []
        }; // Store match history for charts by category
        this.activeChartView = 'all'; // Default chart view
        this.performanceHistory = []; // Store performance index history
        this.chartOptions = {
            // New chart display options
            displayMode: 'all', // 'all', 'h2h', 'team1', 'team2'
            colorMode: 'gradient', // 'gradient', 'solid', 'team'
            animationSpeed: 'normal' // 'fast', 'normal', 'slow'
        };
    }

    initializeEventListeners() {
        // Update team labels when team names change
        document.getElementById('team1').addEventListener('input', () => this.updateTeamLabels());
        document.getElementById('team2').addEventListener('input', () => this.updateTeamLabels());
        
        // Update data counters
        const scoreInputs = ['h2h-team1', 'h2h-team2', 'team1-scores', 'team1-opponent', 'team2-scores', 'team2-opponent'];
        scoreInputs.forEach(id => {
            document.getElementById(id).addEventListener('input', () => this.updateDataSummary());
        });

        // Analyze button
        document.getElementById('analyze-button').addEventListener('click', () => this.runAnalysis());
        
        // Chart display mode selector
        document.getElementById('chart-display-mode').addEventListener('change', (e) => {
            this.chartOptions.displayMode = e.target.value;
            this.updateChartDisplay();
        });
        
        // Chart color mode selector
        document.getElementById('chart-color-mode').addEventListener('change', (e) => {
            this.chartOptions.colorMode = e.target.value;
            this.updateChartDisplay();
        });
        
        // Fix Android chart scaling issues
        this.preventChartAutoResize();
    }

    // Prevent chart auto-resize issues on mobile/Android
    preventChartAutoResize() {
        const chartContainers = document.querySelectorAll('.chart-card canvas');
        chartContainers.forEach(canvas => {
            // Prevent default touch behaviors that might trigger zoom
            canvas.addEventListener('touchstart', (e) => {
                e.preventDefault();
            }, { passive: false });
            
            canvas.addEventListener('touchmove', (e) => {
                e.preventDefault();
            }, { passive: false });
            
            canvas.addEventListener('touchend', (e) => {
                e.preventDefault();
            }, { passive: false });
        });
    }

    updateTeamLabels() {
        const team1Name = document.getElementById('team1').value || 'Team 1';
        const team2Name = document.getElementById('team2').value || 'Team 2';

        // Update all labels that reference team names
        document.getElementById('h2h-team1-label').textContent = `${team1Name} Scores (comma separated)`;
        document.getElementById('h2h-team2-label').textContent = `${team2Name} Scores (comma separated)`;
        document.getElementById('team1-scores-label').textContent = `${team1Name} Scores (comma separated)`;
        document.getElementById('team2-scores-label').textContent = `${team2Name} Scores (comma separated)`;
        
        // Update chart selector labels if they exist
        const chartViewSelector = document.getElementById('chart-display-mode');
        if (chartViewSelector) {
            const options = chartViewSelector.options;
            for (let i = 0; i < options.length; i++) {
                if (options[i].value === 'team1') {
                    options[i].text = `${team1Name} Only`;
                } else if (options[i].value === 'team2') {
                    options[i].text = `${team2Name} Only`;
                }
            }
        }
    }

    updateDataSummary() {
        const h2hTeam1 = this.parseScores(document.getElementById('h2h-team1').value);
        const h2hTeam2 = this.parseScores(document.getElementById('h2h-team2').value);
        const team1Scores = this.parseScores(document.getElementById('team1-scores').value);
        const team2Scores = this.parseScores(document.getElementById('team2-scores').value);

        document.getElementById('h2h-count').textContent = Math.min(h2hTeam1.length, h2hTeam2.length);
        document.getElementById('team1-count').textContent = team1Scores.length;
        document.getElementById('team2-count').textContent = team2Scores.length;
    }

    parseScores(scoreString) {
        if (!scoreString) return [];
        return scoreString.split(',')
            .map(s => parseFloat(s.trim()))
            .filter(s => !isNaN(s));
    }

    async runAnalysis() {
        // Show loading state
        document.getElementById('analysis-loading').classList.remove('hidden');
        document.getElementById('analysis-results').classList.add('hidden');
        document.getElementById('results').style.display = 'block';

        try {
            // Collect all input data
            const inputData = this.collectInputData();
            
            // Validate input data
            if (!this.validateInputData(inputData)) {
                return;
            }

            // Prepare match history data
            this.prepareMatchHistory(inputData);

            // Run Monte Carlo simulation with improved algorithm
            this.simulationResults = await this.runMonteCarloSimulation(inputData);
            
            // Calculate performance index
            this.calculatePerformanceIndex(inputData);
            
            // Display results
            this.displayResults(this.simulationResults, inputData);
            
            // Hide loading, show results
            document.getElementById('analysis-loading').classList.add('hidden');
            document.getElementById('analysis-results').classList.remove('hidden');

        } catch (error) {
            console.error('Analysis error:', error);
            this.showToast('Analysis failed. Please check your input data.', 'error');
            document.getElementById('analysis-loading').classList.add('hidden');
        }
    }

    prepareMatchHistory(inputData) {
        // Store head-to-head matches
        const h2hMatches = [];
        const h2hTeam1 = inputData.h2hTeam1;
        const h2hTeam2 = inputData.h2hTeam2;
        
        for (let i = 0; i < Math.min(h2hTeam1.length, h2hTeam2.length); i++) {
            h2hMatches.push({
                team1Score: h2hTeam1[i],
                team2Score: h2hTeam2[i],
                total: h2hTeam1[i] + h2hTeam2[i],
                date: `Match ${i+1}`
            });
        }
        
        // Store team 1 matches
        const team1Matches = [];
        const team1Recent = inputData.team1Recent;
        const team1Opponent = inputData.team1OpponentRecent;
        
        for (let i = 0; i < Math.min(team1Recent.length, team1Opponent.length); i++) {
            team1Matches.push({
                team1Score: team1Recent[i],
                team2Score: team1Opponent[i],
                total: team1Recent[i] + team1Opponent[i],
                date: `Match ${i+1}`
            });
        }
        
        // Store team 2 matches
        const team2Matches = [];
        const team2Recent = inputData.team2Recent;
        const team2Opponent = inputData.team2OpponentRecent;
        
        for (let i = 0; i < Math.min(team2Recent.length, team2Opponent.length); i++) {
            team2Matches.push({
                team1Score: team2Opponent[i],
                team2Score: team2Recent[i], // Note: for team2 matches, team2's score is in position 2
                total: team2Recent[i] + team2Opponent[i],
                date: `Match ${i+1}`
            });
        }
        
        // Store match history by category
        this.matchHistory = {
            h2h: h2hMatches.slice(-5), // Last 5 matches
            team1: team1Matches.slice(-5), // Last 5 matches
            team2: team2Matches.slice(-5) // Last 5 matches
        };
        
        // Calculate performance trends for overtime chart
        this.calculatePerformanceTrends(inputData);
    }
    
    calculatePerformanceTrends(inputData) {
        const team1Trend = [];
        const team2Trend = [];
        
        // Calculate team 1 performance trend
        if (inputData.team1Recent.length > 0 && inputData.team1OpponentRecent.length > 0) {
            for (let i = 0; i < Math.min(inputData.team1Recent.length, inputData.team1OpponentRecent.length); i++) {
                // Calculate a performance index based on score difference and normalized by match importance
                const scoreDiff = inputData.team1Recent[i] - inputData.team1OpponentRecent[i];
                const matchImportance = i === 0 ? 1.5 : 1.0; // Weight most recent match higher
                
                team1Trend.push({
                    match: i + 1,
                    performance: scoreDiff * matchImportance,
                    goalsScored: inputData.team1Recent[i],
                    goalsConceded: inputData.team1OpponentRecent[i]
                });
            }
        }
        
        // Calculate team 2 performance trend
        if (inputData.team2Recent.length > 0 && inputData.team2OpponentRecent.length > 0) {
            for (let i = 0; i < Math.min(inputData.team2Recent.length, inputData.team2OpponentRecent.length); i++) {
                // Calculate performance similar to team 1
                const scoreDiff = inputData.team2Recent[i] - inputData.team2OpponentRecent[i];
                const matchImportance = i === 0 ? 1.5 : 1.0; // Weight most recent match higher
                
                team2Trend.push({
                    match: i + 1,
                    performance: scoreDiff * matchImportance,
                    goalsScored: inputData.team2Recent[i],
                    goalsConceded: inputData.team2OpponentRecent[i]
                });
            }
        }
        
        // Store performance history for charts
        this.performanceHistory = {
            team1: team1Trend,
            team2: team2Trend
        };
    }

    collectInputData() {
        return {
            team1: document.getElementById('team1').value || 'Team 1',
            team2: document.getElementById('team2').value || 'Team 2',
            team1Ranking: parseInt(document.getElementById('team1-ranking').value) || null,
            team2Ranking: parseInt(document.getElementById('team2-ranking').value) || null,
            matchImportance: document.getElementById('match-importance').value,
            matchType: document.getElementById('match-type').value,
            sportsType: document.getElementById('sports-type').value,
            location: document.getElementById('match-location').value,
            h2hTeam1: this.parseScores(document.getElementById('h2h-team1').value),
            h2hTeam2: this.parseScores(document.getElementById('h2h-team2').value),
            team1Recent: this.parseScores(document.getElementById('team1-scores').value),
            team1OpponentRecent: this.parseScores(document.getElementById('team1-opponent').value),
            team2Recent: this.parseScores(document.getElementById('team2-scores').value),
            team2OpponentRecent: this.parseScores(document.getElementById('team2-opponent').value),
            totalLine: parseFloat(document.getElementById('total-line').value) || null,
            spreadLine: parseFloat(document.getElementById('spread-line').value) || null,
            favoredTeam: document.getElementById('favored-team').value
        };
    }

    validateInputData(data) {
        if (!data.sportsType) {
            this.showToast('Please select a sports type', 'error');
            return false;
        }

        if (!data.team1 || !data.team2) {
            this.showToast('Please enter both team names', 'error');
            return false;
        }

        const totalMatches = data.h2hTeam1.length + data.team1Recent.length + data.team2Recent.length;
        if (totalMatches < 3) {
            this.showToast('Please enter at least 3 total matches for analysis', 'warning');
        }

        return true;
    }

    async runMonteCarloSimulation(data) {
        const numSimulations = 15000; // Increased from 10,000 for higher accuracy
        const results = {
            team1Wins: 0,
            team2Wins: 0,
            draws: 0,
            team1Scores: [],
            team2Scores: [],
            totals: [],
            spreads: [],
            marginsOfVictory: [], // Added to track victory margins
            // For tracking score frequencies
            scoreMatrix: new Map(),
            finalScores: []
        };

        // Calculate team statistics with improved algorithm
        const team1Stats = this.calculateTeamStats(data.team1Recent, data.team1OpponentRecent, data.h2hTeam1, data.h2hTeam2);
        const team2Stats = this.calculateTeamStats(data.team2Recent, data.team2OpponentRecent, data.h2hTeam2, data.h2hTeam1);

        // Calculate adjustment factors
        const adjustments = this.calculateAdjustments(data, team1Stats, team2Stats);

        // Run simulations with improved scoring models
        for (let i = 0; i < numSimulations; i++) {
            const simulation = this.simulateMatch(team1Stats, team2Stats, adjustments, data);
            
            results.team1Scores.push(simulation.team1Score);
            results.team2Scores.push(simulation.team2Score);
            results.totals.push(simulation.total);
            
            // Track exact scoreline frequencies
            const scoreKey = `${simulation.team1Score}-${simulation.team2Score}`;
            if (!results.scoreMatrix.has(scoreKey)) {
                results.scoreMatrix.set(scoreKey, 0);
            }
            results.scoreMatrix.set(scoreKey, results.scoreMatrix.get(scoreKey) + 1);
            
            results.finalScores.push({team1: simulation.team1Score, team2: simulation.team2Score});
            
            if (simulation.team1Score > simulation.team2Score) {
                results.team1Wins++;
                results.marginsOfVictory.push(simulation.team1Score - simulation.team2Score);
            } else if (simulation.team2Score > simulation.team1Score) {
                results.team2Wins++;
                results.marginsOfVictory.push(simulation.team2Score - simulation.team1Score);
            } else {
                results.draws++;
                results.marginsOfVictory.push(0);
            }

            // Calculate spread
            const spread = simulation.team1Score - simulation.team2Score;
            results.spreads.push(spread);
        }

        // Calculate enhanced probabilities
        const probabilities = this.calculateProbabilities(results, numSimulations, data);
        
        return {
            results,
            probabilities,
            team1Stats,
            team2Stats,
            adjustments,
            numSimulations,
            mostLikelyScores: this.calculateMostLikelyScores(results.scoreMatrix),
            performanceAnalysis: this.analyzeTeamPerformance(team1Stats, team2Stats, adjustments)
        };
    }

    calculateTeamStats(scores, opponentScores, h2hScores, h2hOpponentScores) {
        // Input scores are from oldest to newest, so we need to give more weight to newer matches (end of array)
        const weightedScores = [...scores];
        const weightedOpponentScores = [...opponentScores];
        
        // Weight more recent matches higher (later in array = more recent = higher weight)
        for (let i = 0; i < weightedScores.length; i++) {
            const recencyWeight = 1 + (i * 0.1); // More recent matches get higher weights
            weightedScores[i] = weightedScores[i] * recencyWeight;
            if (i < weightedOpponentScores.length) {
                weightedOpponentScores[i] = weightedOpponentScores[i] * recencyWeight;
            }
        }
        
        // Process head-to-head with special weighting (assuming oldest to newest)
        const processedH2h = [...h2hScores];
        // Weight more recent h2h matches higher 
        for (let i = 0; i < processedH2h.length; i++) {
            const h2hWeight = 1.2 + (i * 0.05); // More recent h2h get higher weights
            processedH2h[i] = processedH2h[i] * h2hWeight;
        }
        
        const allScores = [...weightedScores, ...processedH2h];
        const allOpponentScores = [...weightedOpponentScores];
        
        // Calculate first-half / second-half scoring tendencies by estimating
        const firstHalfScoring = this.mean(allScores) * 0.4; // Estimate: 40% of goals in first half
        const secondHalfScoring = this.mean(allScores) * 0.6; // Estimate: 60% of goals in second half
        
        // Calculate additional advanced metrics
        const goalDifference = this.mean(weightedScores) - this.mean(weightedOpponentScores);
        const defensiveStrength = 1 / (this.mean(weightedOpponentScores) || 1);
        const offensiveEfficiency = this.mean(weightedScores) / (this.standardDeviation(weightedScores) || 1);
        
        // Calculate expected goals model using simplified xG approximation
        const xGModel = {
            created: this.mean(weightedScores) * 1.1, // Simple xG model: actual goals * 1.1
            conceded: this.mean(weightedOpponentScores) * 0.9 // Simple xG against: actual conceded * 0.9
        };
        
        return {
            avgScore: this.mean(allScores) || 1.5,
            stdScore: this.standardDeviation(allScores) || 1.0,
            avgConceded: this.mean(allOpponentScores) || 1.5,
            stdConceded: this.standardDeviation(allOpponentScores) || 1.0,
            form: this.calculateForm(scores, opponentScores),
            goalDifference,
            defensiveStrength,
            offensiveEfficiency,
            matches: allScores.length,
            firstHalfScoring,
            secondHalfScoring,
            xGModel,
            h2hPerformance: this.calculateH2HPerformance(h2hScores, h2hOpponentScores),
            scoringConsistency: 1 - (this.standardDeviation(allScores) / (this.mean(allScores) || 1)),
            defensiveConsistency: 1 - (this.standardDeviation(allOpponentScores) / (this.mean(allOpponentScores) || 1))
        };
    }
    
    // New method to calculate head-to-head performance
    calculateH2HPerformance(teamScores, opponentScores) {
        if (!teamScores.length || !opponentScores.length) return 0.5;
        
        let wins = 0;
        let draws = 0;
        const totalMatches = Math.min(teamScores.length, opponentScores.length);
        
        for (let i = 0; i < totalMatches; i++) {
            if (teamScores[i] > opponentScores[i]) wins++;
            else if (teamScores[i] === opponentScores[i]) draws++;
        }
        
        // Calculate h2h performance as a normalized value between 0-1
        return (wins + (draws * 0.5)) / totalMatches;
    }

    calculateAdjustments(data, team1Stats, team2Stats) {
        let homeAdvantage = 0;
        let importanceMultiplier = 1;
        let typeMultiplier = 1;
        let rankingAdjustment = 0;
        let h2hAdjustment = 0;
        let momentumAdjustment = 0;
        let psychologicalEdge = 0;

        // Home advantage - improved with sport-specific values
        if (data.location === 'home') {
            // More precise home advantage by sport type
            switch (data.sportsType) {
                case 'basketball':
                    homeAdvantage = 4.5; // Enhanced for basketball
                    break;
                case 'football':
                    homeAdvantage = 0.35; // Enhanced for football
                    break;
                default:
                    homeAdvantage = 0.3;
            }
        } else if (data.location === 'away') {
            // Away disadvantage
            switch (data.sportsType) {
                case 'basketball':
                    homeAdvantage = -4.5;
                    break;
                case 'football':
                    homeAdvantage = -0.35;
                    break;
                default:
                    homeAdvantage = -0.3;
            }
        }

        // Match importance with finer gradients
        const importanceMap = {
            'friendly': 0.85,
            'regular': 1.0,
            'tournament': 1.15,
            'cup': 1.25,
            'championship': 1.35
        };
        importanceMultiplier = importanceMap[data.matchImportance] || 1.0;

        // Match type with enhanced multipliers
        const typeMap = {
            'regular-round': 1.0,
            'playoffs': 1.15, 
            'knockout-stage': 1.2,
            'relegations': 1.25,
            'final': 1.35
        };
        typeMultiplier = typeMap[data.matchType] || 1.0;

        // Ranking adjustment with improved impact
        if (data.team1Ranking && data.team2Ranking) {
            const rankingDiff = data.team2Ranking - data.team1Ranking;
            const rankingImpact = Math.log10(Math.abs(rankingDiff) + 1) * 0.1; // Logarithmic scaling for better realism
            rankingAdjustment = rankingDiff > 0 ? rankingImpact : -rankingImpact;
        }
        
        // H2H adjustment - giving weight to historical matchups
        const h2hDiff = team1Stats.h2hPerformance - (1 - team2Stats.h2hPerformance);
        h2hAdjustment = h2hDiff * 0.5; // Scale the impact
        
        // Momentum adjustment - based on recent form
        const formDiff = team1Stats.form - team2Stats.form;
        momentumAdjustment = formDiff * 0.4;
        
        // Psychological edge for teams with better stats or on winning streaks
        if (data.team1Recent.length >= 3) {
            // Check for winning streak (last 3 matches)
            const team1WinningStreak = data.team1Recent.slice(0, 3).every((score, i) => 
                i < data.team1OpponentRecent.length && score > data.team1OpponentRecent[i]
            );
            
            if (team1WinningStreak) {
                psychologicalEdge += 0.15;
            }
        }
        
        if (data.team2Recent.length >= 3) {
            // Check for winning streak (last 3 matches)
            const team2WinningStreak = data.team2Recent.slice(0, 3).every((score, i) => 
                i < data.team2OpponentRecent.length && score > data.team2OpponentRecent[i]
            );
            
            if (team2WinningStreak) {
                psychologicalEdge -= 0.15;
            }
        }

        return {
            homeAdvantage,
            importanceMultiplier,
            typeMultiplier,
            rankingAdjustment,
            h2hAdjustment,
            momentumAdjustment,
            psychologicalEdge
        };
    }

    simulateMatch(team1Stats, team2Stats, adjustments, data) {
        // Apply adjustments to expected scores with enhanced formula
        let team1Expected = (
            team1Stats.avgScore * adjustments.importanceMultiplier * adjustments.typeMultiplier + 
            adjustments.homeAdvantage + 
            adjustments.rankingAdjustment + 
            adjustments.h2hAdjustment + 
            adjustments.momentumAdjustment + 
            adjustments.psychologicalEdge
        );
        
        let team2Expected = (
            team2Stats.avgScore * adjustments.importanceMultiplier * adjustments.typeMultiplier - 
            adjustments.homeAdvantage - 
            adjustments.rankingAdjustment - 
            adjustments.h2hAdjustment - 
            adjustments.momentumAdjustment - 
            adjustments.psychologicalEdge
        );

        // Additional adjustment for team defensive strengths (better defenses reduce opponent scoring)
        team1Expected *= (2 - team2Stats.defensiveStrength) / 2;
        team2Expected *= (2 - team1Stats.defensiveStrength) / 2;
        
        // Ensure minimum expected scores
        team1Expected = Math.max(team1Expected, 0.1);
        team2Expected = Math.max(team2Expected, 0.1);

        // Generate scores using different distributions based on sport type
        let team1Score, team2Score;

        if (data.sportsType === 'basketball') {
            // Basketball: Use enhanced normal distribution with higher variance for upset potential
            const upset_factor = Math.random() < 0.15 ? (Math.random() < 0.5 ? 1.3 : 0.7) : 1.0;
            team1Score = Math.max(0, Math.round(this.normalRandom(team1Expected * upset_factor, team1Stats.stdScore * 1.1)));
            team2Score = Math.max(0, Math.round(this.normalRandom(team2Expected * upset_factor, team2Stats.stdScore * 1.1)));
            
            // Basketball scores should be higher and more realistic
            team1Score = team1Score * 10; // Scale up for basketball
            team2Score = team2Score * 10; // Scale up for basketball
            
            // Basketball scores tend to be odd rather than even due to free throws
            if (Math.random() < 0.6) { // 60% chance of odd adjustment
                if (team1Score % 2 === 0) team1Score += 1;
                if (team2Score % 2 === 0) team2Score += 1;
            }
            
            // Enforce minimum basketball score
            team1Score = Math.max(team1Score, 60);
            team2Score = Math.max(team2Score, 60);
        } else {
            // Football: Use enhanced Poisson distribution with correlation
            // Generate base scores
            team1Score = this.poissonRandom(team1Expected);
            team2Score = this.poissonRandom(team2Expected);
            
            // Apply scoring correlation (when one team scores a lot, the other might score more too)
            if (team1Score >= 3 && Math.random() < 0.4) {
                team2Score = Math.max(1, team2Score); // High-scoring games often see both teams score
            }
            
            // Account for occasional exceptional performances or "black swan" events
            if (Math.random() < 0.05) { // 5% chance of outlier result
                if (Math.random() < 0.5) {
                    team1Score += this.poissonRandom(2); // Exceptional performance
                } else {
                    team2Score += this.poissonRandom(2); // Exceptional performance
                }
            }
            
            // Enforce realistic maximum for football
            team1Score = Math.min(team1Score, 7); // Cap at 7 goals
            team2Score = Math.min(team2Score, 7); // Cap at 7 goals
        }

        return {
            team1Score,
            team2Score,
            total: team1Score + team2Score
        };
    }

    calculateProbabilities(results, numSimulations, data) {
        const probs = {
            team1Win: results.team1Wins / numSimulations,
            team2Win: results.team2Wins / numSimulations,
            draw: results.draws / numSimulations,
            doubleChance: {
                team1OrDraw: (results.team1Wins + results.draws) / numSimulations,
                team2OrDraw: (results.team2Wins + results.draws) / numSimulations,
                team1OrTeam2: (results.team1Wins + results.team2Wins) / numSimulations
            },
            btts: {
                yes: results.team1Scores.filter((score, i) => score > 0 && results.team2Scores[i] > 0).length / numSimulations,
                no: results.team1Scores.filter((score, i) => score === 0 || results.team2Scores[i] === 0).length / numSimulations
            },
            scoreMatrix: {}, // Will hold exact scoreline probabilities
            marginOfVictory: {} // Distribution of victory margins
        };
        
        // Calculate margin of victory distribution
        const margins = [...new Set(results.marginsOfVictory)].sort((a, b) => a - b);
        for (const margin of margins) {
            probs.marginOfVictory[margin] = results.marginsOfVictory.filter(m => m === margin).length / numSimulations;
        }
        
        // Process score matrix to get exact scoreline probabilities
        for (const [score, count] of results.scoreMatrix.entries()) {
            probs.scoreMatrix[score] = count / numSimulations;
        }

        // Over/Under calculations
        if (data.totalLine) {
            probs.total = {
                over: results.totals.filter(total => total > data.totalLine).length / numSimulations,
                under: results.totals.filter(total => total < data.totalLine).length / numSimulations,
                exact: results.totals.filter(total => total === data.totalLine).length / numSimulations
            };
        }

        // Spread calculations
        if (data.spreadLine) {
            const adjustedSpreads = results.spreads.map(spread => 
                data.favoredTeam === 'team1' ? spread : -spread
            );
            probs.spread = {
                favorite: adjustedSpreads.filter(spread => spread > data.spreadLine).length / numSimulations,
                underdog: adjustedSpreads.filter(spread => spread < data.spreadLine).length / numSimulations,
                push: adjustedSpreads.filter(spread => spread === data.spreadLine).length / numSimulations
            };
        }
        
        // Add Asian handicap calculations
        if (data.spreadLine) {
            // Calculate quarter-goal handicaps
            const handicaps = [
                data.spreadLine - 0.25,
                data.spreadLine,
                data.spreadLine + 0.25
            ];
            
            probs.asianHandicap = {};
            
            for (const handicap of handicaps) {
                const favoredTeam = data.favoredTeam === 'team1' ? data.team1 : data.team2;
                const spreads = data.favoredTeam === 'team1' ? results.spreads : results.spreads.map(s => -s);
                
                // For Asian handicap, we need special handling for quarter goals
                if (handicap % 1 === 0) {
                    // Whole goal handicap
                    probs.asianHandicap[handicap] = {
                        favorite: spreads.filter(s => s > handicap).length / numSimulations,
                        push: spreads.filter(s => s === handicap).length / numSimulations,
                        underdog: spreads.filter(s => s < handicap).length / numSimulations
                    };
                } else if (handicap % 1 === 0.25) {
                    // Quarter goal handicap (split bet between two handicaps)
                    const lowerHandicap = Math.floor(handicap);
                    const upperHandicap = Math.ceil(handicap);
                    
                    const lowerWin = spreads.filter(s => s > lowerHandicap).length / numSimulations;
                    const upperWin = spreads.filter(s => s > upperHandicap).length / numSimulations;
                    const lowerPush = spreads.filter(s => s === lowerHandicap).length / numSimulations;
                    const upperPush = spreads.filter(s => s === upperHandicap).length / numSimulations;
                    
                    probs.asianHandicap[handicap] = {
                        favorite: (lowerWin * 0.5) + (upperWin * 0.5),
                        push: (lowerPush * 0.5) + (upperPush * 0.5),
                        underdog: 1 - ((lowerWin * 0.5) + (upperWin * 0.5) + (lowerPush * 0.5) + (upperPush * 0.5))
                    };
                } else if (handicap % 1 === 0.5) {
                    // Half goal handicap (no push possible)
                    probs.asianHandicap[handicap] = {
                        favorite: spreads.filter(s => s > handicap).length / numSimulations,
                        push: 0,
                        underdog: spreads.filter(s => s < handicap).length / numSimulations
                    };
                } else if (handicap % 1 === 0.75) {
                    // Three-quarter goal handicap
                    const lowerHandicap = Math.floor(handicap) + 0.5;
                    const upperHandicap = Math.ceil(handicap);
                    
                    const lowerWin = spreads.filter(s => s > lowerHandicap).length / numSimulations;
                    const upperWin = spreads.filter(s => s > upperHandicap).length / numSimulations;
                    
                    probs.asianHandicap[handicap] = {
                        favorite: (lowerWin * 0.5) + (upperWin * 0.5),
                        push: 0,
                        underdog: 1 - ((lowerWin * 0.5) + (upperWin * 0.5))
                    };
                }
            }
        }

        return probs;
    }
    
    // New method to calculate most likely scores
    calculateMostLikelyScores(scoreMatrix) {
        const sortedScores = [...scoreMatrix.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5); // Top 5 most likely scores
            
        return sortedScores.map(([score, count]) => {
            const [team1, team2] = score.split('-').map(Number);
            return {
                team1,
                team2,
                probability: count
            };
        });
    }
    
    // New method to analyze team performance
    analyzeTeamPerformance(team1Stats, team2Stats, adjustments) {
        // Calculate performance indices between 0-100
        const calculateIndex = (stat, min, max) => {
            return Math.min(100, Math.max(0, ((stat - min) / (max - min)) * 100));
        };
        
        // Attack rating (0-100)
        const team1Attack = calculateIndex(team1Stats.avgScore, 0, 3);
        const team2Attack = calculateIndex(team2Stats.avgScore, 0, 3);
        
        // Defense rating (0-100)
        const team1Defense = calculateIndex(2 - team1Stats.avgConceded, 0, 2);
        const team2Defense = calculateIndex(2 - team2Stats.avgConceded, 0, 2);
        
        // Form rating (0-100)
        const team1Form = calculateIndex(team1Stats.form, 0, 1) * 100;
        const team2Form = calculateIndex(team2Stats.form, 0, 1) * 100;
        
        // Consistency rating (0-100)
        const team1Consistency = team1Stats.scoringConsistency * 100;
        const team2Consistency = team2Stats.scoringConsistency * 100;
        
        // Overall team ratings
        const team1Rating = (team1Attack + team1Defense + team1Form + team1Consistency) / 4;
        const team2Rating = (team2Attack + team2Defense + team2Form + team2Consistency) / 4;
        
        return {
            team1: {
                attack: team1Attack,
                defense: team1Defense,
                form: team1Form,
                consistency: team1Consistency,
                overall: team1Rating
            },
            team2: {
                attack: team2Attack,
                defense: team2Defense,
                form: team2Form,
                consistency: team2Consistency,
                overall: team2Rating
            },
            comparison: {
                attackAdvantage: team1Attack - team2Attack,
                defenseAdvantage: team1Defense - team2Defense,
                formAdvantage: team1Form - team2Form,
                consistencyAdvantage: team1Consistency - team2Consistency,
                overallAdvantage: team1Rating - team2Rating
            }
        };
    }
    
    // New method to calculate performance index
    calculatePerformanceIndex(inputData) {
        // Performance index factors
        const factors = [
            { name: 'Recent Form', weight: 0.3 },
            { name: 'Head-to-Head', weight: 0.25 },
            { name: 'Home Advantage', weight: 0.15 },
            { name: 'Team Quality', weight: 0.2 },
            { name: 'Match Importance', weight: 0.1 }
        ];
        
        // Calculate team 1 index
        let team1Index = 0;
        let team2Index = 0;
        
        // Recent form calculation - note: scores are oldest to newest
        const team1RecentForm = this.calculateForm(inputData.team1Recent, inputData.team1OpponentRecent);
        const team2RecentForm = this.calculateForm(inputData.team2Recent, inputData.team2OpponentRecent);
        
        team1Index += team1RecentForm * factors[0].weight * 100;
        team2Index += team2RecentForm * factors[0].weight * 100;
        
        // Head-to-head calculation
        const h2hTeam1 = inputData.h2hTeam1;
        const h2hTeam2 = inputData.h2hTeam2;
        
        if (h2hTeam1.length > 0 && h2hTeam2.length > 0) {
            let team1H2HPerformance = 0;
            
            for (let i = 0; i < Math.min(h2hTeam1.length, h2hTeam2.length); i++) {
                if (h2hTeam1[i] > h2hTeam2[i]) team1H2HPerformance += 1;
                else if (h2hTeam1[i] === h2hTeam2[i]) team1H2HPerformance += 0.5;
            }
            
            team1H2HPerformance /= Math.min(h2hTeam1.length, h2hTeam2.length);
            
            team1Index += team1H2HPerformance * factors[1].weight * 100;
            team2Index += (1 - team1H2HPerformance) * factors[1].weight * 100;
        } else {
            // If no h2h data, distribute points evenly
            team1Index += 0.5 * factors[1].weight * 100;
            team2Index += 0.5 * factors[1].weight * 100;
        }
        
        // Home advantage
        if (inputData.location === 'home') {
            team1Index += 1 * factors[2].weight * 100;
        } else if (inputData.location === 'away') {
            team2Index += 1 * factors[2].weight * 100;
        } else {
            // Neutral - split points
            team1Index += 0.5 * factors[2].weight * 100;
            team2Index += 0.5 * factors[2].weight * 100;
        }
        
        // Team quality (based on ranking if available)
        if (inputData.team1Ranking && inputData.team2Ranking) {
            const totalRanking = inputData.team1Ranking + inputData.team2Ranking;
            const team1Quality = (totalRanking - inputData.team1Ranking) / totalRanking;
            const team2Quality = (totalRanking - inputData.team2Ranking) / totalRanking;
            
            team1Index += team1Quality * factors[3].weight * 100;
            team2Index += team2Quality * factors[3].weight * 100;
        } else {
            // If no ranking data, distribute points based on recent form
            const totalForm = team1RecentForm + team2RecentForm;
            if (totalForm > 0) {
                team1Index += (team1RecentForm / totalForm) * factors[3].weight * 100;
                team2Index += (team2RecentForm / totalForm) * factors[3].weight * 100;
            } else {
                // Split evenly if no form data
                team1Index += 0.5 * factors[3].weight * 100;
                team2Index += 0.5 * factors[3].weight * 100;
            }
        }
        
        // Match importance (same for both teams)
        const importanceMap = {
            'friendly': 0.6,
            'regular': 0.8,
            'tournament': 0.9,
            'cup': 0.95,
            'championship': 1.0
        };
        
        const importanceFactor = importanceMap[inputData.matchImportance] || 0.8;
        team1Index += importanceFactor * factors[4].weight * 100;
        team2Index += importanceFactor * factors[4].weight * 100;
        
        return {
            team1: team1Index,
            team2: team2Index,
            factors: factors
        };
    }

    displayResults(simulation, inputData) {
        this.displayProbabilities(simulation.probabilities, inputData);
        this.displayFactorAnalysis(simulation, inputData);
        this.createCharts(simulation, inputData);
        this.displayExplanation(simulation, inputData);
    }

    displayProbabilities(probs, inputData) {
        // Match Outcome
        document.getElementById('match-outcome-probs').innerHTML = `
            <div class="prob-item">
                <span class="prob-label">${inputData.team1} Win:</span>
                <span class="prob-value ${probs.team1Win > 0.5 ? 'high-prob' : ''}">${(probs.team1Win * 100).toFixed(1)}%</span>
            </div>
            <div class="prob-item">
                <span class="prob-label">Draw:</span>
                <span class="prob-value ${probs.draw > 0.3 ? 'high-prob' : ''}">${(probs.draw * 100).toFixed(1)}%</span>
            </div>
            <div class="prob-item">
                <span class="prob-label">${inputData.team2} Win:</span>
                <span class="prob-value ${probs.team2Win > 0.5 ? 'high-prob' : ''}">${(probs.team2Win * 100).toFixed(1)}%</span>
            </div>
        `;

        // Double Chance
        document.getElementById('double-chance-probs').innerHTML = `
            <div class="prob-item">
                <span class="prob-label">${inputData.team1} or Draw:</span>
                <span class="prob-value">${(probs.doubleChance.team1OrDraw * 100).toFixed(1)}%</span>
            </div>
            <div class="prob-item">
                <span class="prob-label">${inputData.team2} or Draw:</span>
                <span class="prob-value">${(probs.doubleChance.team2OrDraw * 100).toFixed(1)}%</span>
            </div>
            <div class="prob-item">
                <span class="prob-label">${inputData.team1} or ${inputData.team2}:</span>
                <span class="prob-value">${(probs.doubleChance.team1OrTeam2 * 100).toFixed(1)}%</span>
            </div>
        `;

        // Both Teams to Score
        document.getElementById('btts-probs').innerHTML = `
            <div class="prob-item">
                <span class="prob-label">Yes:</span>
                <span class="prob-value ${probs.btts.yes > 0.5 ? 'high-prob' : ''}">${(probs.btts.yes * 100).toFixed(1)}%</span>
            </div>
            <div class="prob-item">
                <span class="prob-label">No:</span>
                <span class="prob-value ${probs.btts.no > 0.5 ? 'high-prob' : ''}">${(probs.btts.no * 100).toFixed(1)}%</span>
            </div>
        `;

        // Total Goals/Points
        let totalHtml = '';
        if (probs.total) {
            totalHtml = `
                <div class="prob-item">
                    <span class="prob-label">Over ${inputData.totalLine}:</span>
                    <span class="prob-value ${probs.total.over > 0.5 ? 'high-prob' : ''}">${(probs.total.over * 100).toFixed(1)}%</span>
                </div>
                <div class="prob-item">
                    <span class="prob-label">Under ${inputData.totalLine}:</span>
                    <span class="prob-value ${probs.total.under > 0.5 ? 'high-prob' : ''}">${(probs.total.under * 100).toFixed(1)}%</span>
                </div>
            `;
        } else {
            totalHtml = '<div class="prob-item"><span class="prob-label">No total line provided</span></div>';
        }
        document.getElementById('total-probs').innerHTML = totalHtml;
        
        // Add most likely scorelines if available
        if (simulation.mostLikelyScores && simulation.mostLikelyScores.length > 0) {
            let scoreHtml = '<div class="likely-scores-section"><h4>Most Likely Scorelines</h4><div class="likely-scores">';
            
            simulation.mostLikelyScores.forEach(score => {
                scoreHtml += `
                    <div class="likely-score-item">
                        <div class="score-display">${score.team1} - ${score.team2}</div>
                        <div class="score-prob">${(score.probability * 100).toFixed(1)}%</div>
                    </div>
                `;
            });
            
            scoreHtml += '</div></div>';
            
            // Append to the probabilities section
            const probabilitySection = document.querySelector('.probability-section');
            if (probabilitySection) {
                const scoreDiv = document.createElement('div');
                scoreDiv.className = 'score-prediction-card';
                scoreDiv.innerHTML = scoreHtml;
                probabilitySection.appendChild(scoreDiv);
            }
        }
    }

    displayFactorAnalysis(simulation, inputData) {
        const factors = this.analyzeFactors(simulation, inputData);
        let factorHtml = '<div class="factor-grid">';

        factors.forEach(factor => {
            factorHtml += `
                <div class="factor-item">
                    <h5>${factor.name}</h5>
                    <div class="factor-impact ${factor.impact}">${factor.description}</div>
                    <div class="factor-value">Impact: ${factor.value}</div>
                </div>
            `;
        });

        factorHtml += '</div>';
        document.getElementById('factor-breakdown').innerHTML = factorHtml;
        
        // Add performance index visualization if available
        if (simulation.performanceAnalysis) {
            const team1 = inputData.team1;
            const team2 = inputData.team2;
            const team1Stats = simulation.performanceAnalysis.team1;
            const team2Stats = simulation.performanceAnalysis.team2;
            
            let performanceHtml = `
                <div class="performance-comparison">
                    <h3><span class="material-symbols-outlined">monitoring</span> Team Performance Analysis</h3>
                    <div class="performance-grid">
                        <div class="performance-stat">
                            <h4>Attack Rating</h4>
                            <div class="stat-comparison">
                                <div class="team-stat">
                                    <span class="team-name">${team1}</span>
                                    <div class="stat-bar-container">
                                        <div class="stat-bar team1" style="width: ${team1Stats.attack}%"></div>
                                    </div>
                                    <span class="stat-value">${team1Stats.attack.toFixed(0)}</span>
                                </div>
                                <div class="team-stat">
                                    <span class="team-name">${team2}</span>
                                    <div class="stat-bar-container">
                                        <div class="stat-bar team2" style="width: ${team2Stats.attack}%"></div>
                                    </div>
                                    <span class="stat-value">${team2Stats.attack.toFixed(0)}</span>
                                </div>
                            </div>
                        </div>
                        <div class="performance-stat">
                            <h4>Defense Rating</h4>
                            <div class="stat-comparison">
                                <div class="team-stat">
                                    <span class="team-name">${team1}</span>
                                    <div class="stat-bar-container">
                                        <div class="stat-bar team1" style="width: ${team1Stats.defense}%"></div>
                                    </div>
                                    <span class="stat-value">${team1Stats.defense.toFixed(0)}</span>
                                </div>
                                <div class="team-stat">
                                    <span class="team-name">${team2}</span>
                                    <div class="stat-bar-container">
                                        <div class="stat-bar team2" style="width: ${team2Stats.defense}%"></div>
                                    </div>
                                    <span class="stat-value">${team2Stats.defense.toFixed(0)}</span>
                                </div>
                            </div>
                        </div>
                        <div class="performance-stat">
                            <h4>Form Rating</h4>
                            <div class="stat-comparison">
                                <div class="team-stat">
                                    <span class="team-name">${team1}</span>
                                    <div class="stat-bar-container">
                                        <div class="stat-bar team1" style="width: ${team1Stats.form}%"></div>
                                    </div>
                                    <span class="stat-value">${team1Stats.form.toFixed(0)}</span>
                                </div>
                                <div class="team-stat">
                                    <span class="team-name">${team2}</span>
                                    <div class="stat-bar-container">
                                        <div class="stat-bar team2" style="width: ${team2Stats.form}%"></div>
                                    </div>
                                    <span class="stat-value">${team2Stats.form.toFixed(0)}</span>
                                </div>
                            </div>
                        </div>
                        <div class="performance-stat">
                            <h4>Overall Rating</h4>
                            <div class="stat-comparison">
                                <div class="team-stat">
                                    <span class="team-name">${team1}</span>
                                    <div class="stat-bar-container">
                                        <div class="stat-bar team1" style="width: ${team1Stats.overall}%"></div>
                                    </div>
                                    <span class="stat-value">${team1Stats.overall.toFixed(0)}</span>
                                </div>
                                <div class="team-stat">
                                    <span class="team-name">${team2}</span>
                                    <div class="stat-bar-container">
                                        <div class="stat-bar team2" style="width: ${team2Stats.overall}%"></div>
                                    </div>
                                    <span class="stat-value">${team2Stats.overall.toFixed(0)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Add to factor analysis section
            const factorSection = document.querySelector('.factor-analysis');
            if (factorSection) {
                const performanceDiv = document.createElement('div');
                performanceDiv.className = 'performance-analysis-card';
                performanceDiv.innerHTML = performanceHtml;
                factorSection.appendChild(performanceDiv);
            }
        }
    }

    analyzeFactors(simulation, inputData) {
        const factors = [];

        // Home Advantage
        if (inputData.location !== 'neutral') {
            const homeTeam = inputData.location === 'home' ? inputData.team1 : inputData.team2;
            const advantageStrength = inputData.sportsType === 'basketball' ? 'Strong' : 'Moderate';
            factors.push({
                name: 'Home Advantage',
                description: `${homeTeam} plays at home`,
                impact: inputData.sportsType === 'basketball' ? 'high' : 'medium',
                value: advantageStrength
            });
        }

        // Team Momentum
        const team1Form = simulation.team1Stats.form;
        const team2Form = simulation.team2Stats.form;
        if (Math.abs(team1Form - team2Form) > 0.2) {
            const betterTeam = team1Form > team2Form ? inputData.team1 : inputData.team2;
            factors.push({
                name: 'Team Momentum',
                description: `${betterTeam} has better recent form`,
                impact: 'medium',
                value: `${(Math.abs(team1Form - team2Form) * 100).toFixed(0)}% difference`
            });
        }

        // Scoring Trends
        const avgTotal = this.mean(simulation.results.totals);
        const expectedTotal = simulation.team1Stats.avgScore + simulation.team2Stats.avgScore;
        if (Math.abs(avgTotal - expectedTotal) > 0.5) {
            factors.push({
                name: 'Scoring Trends',
                description: avgTotal > expectedTotal ? 'High-scoring match expected' : 'Low-scoring match expected',
                impact: 'medium',
                value: `${avgTotal.toFixed(1)} avg total`
            });
        }

        // Match Importance
        if (inputData.matchImportance !== 'regular') {
            factors.push({
                name: 'Match Importance',
                description: `${inputData.matchImportance.charAt(0).toUpperCase() + inputData.matchImportance.slice(1)} match increases intensity`,
                impact: inputData.matchImportance === 'championship' ? 'high' : 'medium',
                value: `${((simulation.adjustments.importanceMultiplier - 1) * 100).toFixed(0)}% intensity boost`
            });
        }

        // Ranking Difference
        if (inputData.team1Ranking && inputData.team2Ranking) {
            const rankingDiff = Math.abs(inputData.team1Ranking - inputData.team2Ranking);
            if (rankingDiff > 5) {
                const favoriteTeam = inputData.team1Ranking < inputData.team2Ranking ? inputData.team1 : inputData.team2;
                factors.push({
                    name: 'Ranking Advantage',
                    description: `${favoriteTeam} is significantly higher ranked`,
                    impact: rankingDiff > 20 ? 'high' : 'medium',
                    value: `${rankingDiff} positions difference`
                });
            }
        }
        
        // Head-to-Head History
        if (simulation.team1Stats.h2hPerformance !== 0.5) {
            const h2hTeam = simulation.team1Stats.h2hPerformance > 0.5 ? inputData.team1 : inputData.team2;
            const h2hDiff = Math.abs(simulation.team1Stats.h2hPerformance - 0.5) * 2 * 100;
            
            factors.push({
                name: 'H2H Advantage',
                description: `${h2hTeam} has better head-to-head record`,
                impact: h2hDiff > 30 ? 'high' : 'medium',
                value: `${h2hDiff.toFixed(0)}% edge`
            });
        }
        
        // Psychological Factors
        if (simulation.adjustments.psychologicalEdge !== 0) {
            const psychTeam = simulation.adjustments.psychologicalEdge > 0 ? inputData.team1 : inputData.team2;
            
            factors.push({
                name: 'Psychological Edge',
                description: `${psychTeam} has psychological advantage`,
                impact: 'medium',
                value: `${Math.abs(simulation.adjustments.psychologicalEdge * 100).toFixed(0)}% mental edge`
            });
        }

        return factors;
    }

    updateChartDisplay() {
        // Re-create charts with new display options
        const simulation = this.simulationResults;
        const inputData = this.collectInputData();
        
        if (simulation) {
            this.createCharts(simulation, inputData);
        }
    }

    createCharts(simulation, inputData) {
        this.createScoreDistributionChart(simulation, inputData);
        this.createOutcomePieChart(simulation, inputData);
        this.createOverUnderChart(simulation, inputData);
        this.createSpreadChart(simulation, inputData);
        this.createPerformanceIndexChart(simulation, inputData);
    }

    createScoreDistributionChart(simulation, inputData) {
        const ctx = document.getElementById('score-distribution-chart').getContext('2d');
        
        // Create histogram of total scores
        const totals = simulation.results.totals;
        const minTotal = Math.min(...totals);
        const maxTotal = Math.max(...totals);
        const bins = [];
        const binSize = inputData.sportsType === 'basketball' ? 10 : 1;
        
        for (let i = minTotal; i <= maxTotal; i += binSize) {
            bins.push(i);
        }
        
        const frequencies = bins.map(bin => 
            totals.filter(total => 
                Math.floor(total / binSize) === Math.floor(bin / binSize)
            ).length
        );
        
        // Show top bins for better visualization
        const topBins = 12;
        const displayBins = bins.slice(0, Math.min(topBins, bins.length));
        const displayFreqs = frequencies.slice(0, Math.min(topBins, frequencies.length));

        // Use gradient colors based on option
        let gradientColors;
        if (this.chartOptions.colorMode === 'gradient') {
            gradientColors = {
                start: '#1a73e8',
                end: '#0d47a1'
            };
        } else if (this.chartOptions.colorMode === 'team') {
            gradientColors = {
                start: '#4285f4',
                end: '#3367d6'
            };
        } else {
            gradientColors = {
                start: '#4285f4',
                end: '#4285f4'
            };
        }

        if (this.charts.scoreDistribution) {
            this.charts.scoreDistribution.destroy();
        }

        this.charts.scoreDistribution = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: displayBins,
                datasets: [{
                    label: 'Frequency',
                    data: displayFreqs,
                    backgroundColor: '#3b82f6',
                    borderWidth: 0,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                devicePixelRatio: 2, // Higher resolution for HD display
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const totalSimulations = simulation.numSimulations;
                                const percentage = ((value / totalSimulations) * 100).toFixed(1);
                                return `Frequency: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        },
                        title: {
                            display: true,
                            text: 'Frequency',
                            color: '#1a73e8',
                            font: {
                                weight: '600'
                            }
                        },
                        ticks: {
                            color: '#1a73e8',
                            font: {
                                weight: '500'
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'Total Score',
                            color: '#1a73e8',
                            font: {
                                weight: '600'
                            }
                        },
                        ticks: {
                            color: '#1a73e8',
                            font: {
                                weight: '500'
                            }
                        }
                    }
                }
            }
        });

        // Apply gradient after creation
        setTimeout(() => {
            const chart = this.charts.scoreDistribution;
            const ctx = chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, gradientColors.start);
            gradient.addColorStop(1, gradientColors.end);
            
            chart.data.datasets[0].backgroundColor = gradient;
            chart.update('none');
        }, 100);
    }

    createOutcomePieChart(simulation, inputData) {
        const ctx = document.getElementById('outcome-pie-chart').getContext('2d');
        
        // Enhanced colors with gradients
        const team1Color = '#4285f4';
        const drawColor = '#9aa0a6';
        const team2Color = '#0d47a1'; 
        
        const data = {
            labels: [`${inputData.team1} Win`, 'Draw', `${inputData.team2} Win`],
            datasets: [{
                data: [
                    (simulation.probabilities.team1Win * 100).toFixed(1),
                    (simulation.probabilities.draw * 100).toFixed(1),
                    (simulation.probabilities.team2Win * 100).toFixed(1)
                ],
                backgroundColor: [team1Color, drawColor, team2Color],
                borderWidth: 3,
                borderColor: '#ffffff',
                hoverBorderWidth: 5
            }]
        };

        if (this.charts.outcomePie) {
            this.charts.outcomePie.destroy();
        }

        this.charts.outcomePie = new Chart(ctx, {
            type: 'pie',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                devicePixelRatio: 2, // Higher resolution
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                weight: '500',
                                family: 'Google Sans'
                            },
                            color: '#202124'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                const value = parseFloat(context.raw);
                                return `${context.label}: ${value}%`;
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 1000
                }
            }
        });
        
        // Apply gradient effects if needed
        if (this.chartOptions.colorMode === 'gradient') {
            setTimeout(() => {
                const chart = this.charts.outcomePie;
                const ctx = chart.ctx;
                
                // Create gradients for each segment
                const team1Gradient = ctx.createLinearGradient(0, 0, 0, 400);
                team1Gradient.addColorStop(0, '#4285f4');
                team1Gradient.addColorStop(1, '#0d47a1');
                
                const drawGradient = ctx.createLinearGradient(0, 0, 0, 400);
                drawGradient.addColorStop(0, '#9aa0a6');
                drawGradient.addColorStop(1, '#5f6368');
                
                const team2Gradient = ctx.createLinearGradient(0, 0, 0, 400);
                team2Gradient.addColorStop(0, '#0d47a1');
                team2Gradient.addColorStop(1, '#073d9a');
                
                chart.data.datasets[0].backgroundColor = [team1Gradient, drawGradient, team2Gradient];
                chart.update('none');
            }, 100);
        }
    }

    createOverUnderChart(simulation, inputData) {
        const ctx = document.getElementById('over-under-chart').getContext('2d');
        
        let data, labels;
        if (simulation.probabilities.total) {
            data = [
                (simulation.probabilities.total.over * 100).toFixed(1),
                (simulation.probabilities.total.under * 100).toFixed(1)
            ];
            labels = [`Over ${inputData.totalLine}`, `Under ${inputData.totalLine}`];
        } else {
            // Show general over/under distribution around average
            const avgTotal = this.mean(simulation.results.totals);
            const overAvg = simulation.results.totals.filter(t => t > avgTotal).length / simulation.numSimulations;
            const underAvg = simulation.results.totals.filter(t => t < avgTotal).length / simulation.numSimulations;
            
            data = [(overAvg * 100).toFixed(1), (underAvg * 100).toFixed(1)];
            labels = [`Over ${avgTotal.toFixed(1)}`, `Under ${avgTotal.toFixed(1)}`];
        }

        // Enhanced colors with blue gradient theme
        const overColor = '#4285f4';
        const underColor = '#0d47a1';

        if (this.charts.overUnder) {
            this.charts.overUnder.destroy();
        }

        this.charts.overUnder = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [overColor, underColor],
                    borderWidth: 3,
                    borderColor: '#ffffff',
                    hoverBorderWidth: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                devicePixelRatio: 2, // Higher resolution
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                weight: '500',
                                family: 'Google Sans'
                            },
                            color: '#202124'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 1000
                }
            }
        });
        
        // Apply gradient effects if needed
        if (this.chartOptions.colorMode === 'gradient') {
            setTimeout(() => {
                const chart = this.charts.overUnder;
                const ctx = chart.ctx;
                
                // Create gradients for each segment
                const overGradient = ctx.createLinearGradient(0, 0, 0, 400);
                overGradient.addColorStop(0, '#4285f4');
                overGradient.addColorStop(1, '#1a73e8');
                
                const underGradient = ctx.createLinearGradient(0, 0, 0, 400);
                underGradient.addColorStop(0, '#0d47a1');
                underGradient.addColorStop(1, '#073d9a');
                
                chart.data.datasets[0].backgroundColor = [overGradient, underGradient];
                chart.update('none');
            }, 100);
        }
    }

    createSpreadChart(simulation, inputData) {
        const ctx = document.getElementById('spread-chart').getContext('2d');
        
        let data, labels;
        if (simulation.probabilities.spread) {
            const favoriteTeam = inputData.favoredTeam === 'team1' ? inputData.team1 : inputData.team2;
            const underdog = inputData.favoredTeam === 'team1' ? inputData.team2 : inputData.team1;
            
            data = [
                (simulation.probabilities.spread.favorite * 100).toFixed(1),
                (simulation.probabilities.spread.underdog * 100).toFixed(1)
            ];
            labels = [`${favoriteTeam} -${inputData.spreadLine}`, `${underdog} +${inputData.spreadLine}`];
        } else {
            // Show win percentage distribution
            data = [
                (simulation.probabilities.team1Win * 100).toFixed(1),
                (simulation.probabilities.team2Win * 100).toFixed(1)
            ];
            labels = [inputData.team1, inputData.team2];
        }

        // Enhanced colors with blue gradient theme
        const favoriteColor = '#4285f4';
        const underdogColor = '#0d47a1';

        if (this.charts.spread) {
            this.charts.spread.destroy();
        }

        this.charts.spread = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [favoriteColor, underdogColor],
                    borderWidth: 3,
                    borderColor: '#ffffff',
                    hoverBorderWidth: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                devicePixelRatio: 2, // Higher resolution
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                weight: '500',
                                family: 'Google Sans'
                            },
                            color: '#202124'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 1000
                }
            }
        });
        
        // Apply gradient effects if needed
        if (this.chartOptions.colorMode === 'gradient') {
            setTimeout(() => {
                const chart = this.charts.spread;
                const ctx = chart.ctx;
                
                // Create gradients for each segment
                const favoriteGradient = ctx.createLinearGradient(0, 0, 0, 400);
                favoriteGradient.addColorStop(0, '#4285f4');
                favoriteGradient.addColorStop(1, '#1a73e8');
                
                const underdogGradient = ctx.createLinearGradient(0, 0, 0, 400);
                underdogGradient.addColorStop(0, '#0d47a1');
                underdogGradient.addColorStop(1, '#073d9a');
                
                chart.data.datasets[0].backgroundColor = [favoriteGradient, underdogGradient];
                chart.update('none');
            }, 100);
        }
    }
    
    // New method to create performance index over time chart
    createPerformanceIndexChart(simulation, inputData) {
        const ctx = document.getElementById('performance-chart').getContext('2d');
        
        // Prepare data for performance chart based on display mode
        let performanceData = [];
        
        if (this.chartOptions.displayMode === 'all' || this.chartOptions.displayMode === 'team1') {
            performanceData.push({
                label: inputData.team1,
                data: this.performanceHistory.team1.map(p => p.performance),
                borderColor: '#4285f4',
                backgroundColor: 'rgba(66, 133, 244, 0.1)',
                fill: true,
                tension: 0.4
            });
        }
        
        if (this.chartOptions.displayMode === 'all' || this.chartOptions.displayMode === 'team2') {
            performanceData.push({
                label: inputData.team2,
                data: this.performanceHistory.team2.map(p => p.performance),
                borderColor: '#0d47a1',
                backgroundColor: 'rgba(13, 71, 161, 0.1)',
                fill: true,
                tension: 0.4
            });
        }
        
        // Create x-axis labels - most recent match first
        const labels = [];
        const maxMatches = Math.max(
            this.performanceHistory.team1.length,
            this.performanceHistory.team2.length
        );
        
        for (let i = maxMatches; i > 0; i--) {
            labels.push(`Match ${i}`);
        }
        
        // Reverse data to match labels (most recent match last)
        performanceData.forEach(dataset => {
            dataset.data.reverse();
        });

        if (this.charts.performance) {
            this.charts.performance.destroy();
        }

        this.charts.performance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: performanceData
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                devicePixelRatio: 2, // Higher resolution
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                weight: '500',
                                family: 'Google Sans'
                            },
                            color: '#202124'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                return `Performance: ${value.toFixed(1)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        },
                        title: {
                            display: true,
                            text: 'Performance Index',
                            color: '#1a73e8',
                            font: {
                                weight: '600'
                            }
                        },
                        ticks: {
                            color: '#1a73e8',
                            font: {
                                weight: '500'
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'Recent Matches',
                            color: '#1a73e8',
                            font: {
                                weight: '600'
                            }
                        },
                        ticks: {
                            color: '#1a73e8',
                            font: {
                                weight: '500'
                            },
                            reverse: false
                        }
                    }
                },
                elements: {
                    point: {
                        radius: 6,
                        hoverRadius: 8
                    },
                    line: {
                        borderWidth: 3
                    }
                },
                animation: {
                    duration: 1500
                }
            }
        });
        
        // Apply gradient effects if needed
        if (this.chartOptions.colorMode === 'gradient') {
            setTimeout(() => {
                const chart = this.charts.performance;
                const ctx = chart.ctx;
                
                chart.data.datasets.forEach((dataset, index) => {
                    if (index === 0) {
                        // Team 1 gradient
                        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                        gradient.addColorStop(0, 'rgba(66, 133, 244, 0.8)');
                        gradient.addColorStop(1, 'rgba(66, 133, 244, 0.1)');
                        dataset.backgroundColor = gradient;
                    } else {
                        // Team 2 gradient
                        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                        gradient.addColorStop(0, 'rgba(13, 71, 161, 0.8)');
                        gradient.addColorStop(1, 'rgba(13, 71, 161, 0.1)');
                        dataset.backgroundColor = gradient;
                    }
                });
                
                chart.update('none');
            }, 100);
        }
    }

    displayExplanation(simulation, inputData) {
        const explanation = this.generateExplanation(simulation, inputData);
        document.getElementById('detailed-explanation').innerHTML = explanation;
    }

    generateExplanation(simulation, inputData) {
        const probs = simulation.probabilities;
        const winner = probs.team1Win > probs.team2Win ? inputData.team1 : inputData.team2;
        const winnerProb = Math.max(probs.team1Win, probs.team2Win);
        const avgTotal = this.mean(simulation.results.totals);
        
        // Get most likely score if available
        let mostLikelyScore = '';
        if (simulation.mostLikelyScores && simulation.mostLikelyScores.length > 0) {
            const topScore = simulation.mostLikelyScores[0];
            mostLikelyScore = `${topScore.team1}-${topScore.team2}`;
        }

        let explanation = `
            <div class="explanation-content">
                <h4>Monte Carlo Analysis Summary</h4>
                <p>Based on ${simulation.numSimulations.toLocaleString()} simulations using historical match data, statistical analysis, and various contextual factors.</p>
                
                <h4>Key Findings</h4>
                <ul>
                    <li><strong>Most Likely Winner:</strong> ${winner} (${(winnerProb * 100).toFixed(1)}% probability)</li>
                    <li><strong>Expected Total Score:</strong> ${avgTotal.toFixed(1)} ${inputData.sportsType === 'basketball' ? 'points' : 'goals'}</li>
                    <li><strong>Draw Probability:</strong> ${(probs.draw * 100).toFixed(1)}%</li>
                    ${mostLikelyScore ? `<li><strong>Most Likely Score:</strong> ${mostLikelyScore}</li>` : ''}
                </ul>

                <h4>Statistical Insights</h4>
                <ul>
                    <li><strong>${inputData.team1} Average:</strong> ${this.mean(simulation.results.team1Scores).toFixed(1)} ± ${this.standardDeviation(simulation.results.team1Scores).toFixed(1)}</li>
                    <li><strong>${inputData.team2} Average:</strong> ${this.mean(simulation.results.team2Scores).toFixed(1)} ± ${this.standardDeviation(simulation.results.team2Scores).toFixed(1)}</li>
                    <li><strong>Both Teams Score:</strong> ${(probs.btts.yes * 100).toFixed(1)}% probability</li>
                </ul>
        `;

        if (probs.total) {
            explanation += `
                <h4>Betting Recommendations</h4>
                <ul>
                    <li><strong>Total ${inputData.totalLine}:</strong> ${probs.total.over > probs.total.under ? 'Over' : 'Under'} (${(Math.max(probs.total.over, probs.total.under) * 100).toFixed(1)}% confidence)</li>
                </ul>
            `;
        }

        if (probs.spread) {
            const favoriteTeam = inputData.favoredTeam === 'team1' ? inputData.team1 : inputData.team2;
            explanation += `
                <ul>
                    <li><strong>Spread Bet:</strong> ${probs.spread.favorite > 0.5 ? favoriteTeam + ' -' + inputData.spreadLine : 'Underdog +' + inputData.spreadLine} (${(Math.max(probs.spread.favorite, probs.spread.underdog) * 100).toFixed(1)}% confidence)</li>
                </ul>
            `;
        }
        
        // Add advanced analysis section
        explanation += `
            <h4>Advanced Statistical Analysis</h4>
            <ul>
                <li><strong>Performance Comparison:</strong> ${inputData.team1} (${simulation.performanceAnalysis?.team1.overall.toFixed(0) || "N/A"}) vs ${inputData.team2} (${simulation.performanceAnalysis?.team2.overall.toFixed(0) || "N/A"})</li>
                <li><strong>Expected Margin:</strong> ${this.mean(simulation.results.spreads).toFixed(2)} in favor of ${this.mean(simulation.results.spreads) > 0 ? inputData.team1 : inputData.team2}</li>
                <li><strong>Scoring Efficiency:</strong> ${inputData.team1} (${simulation.team1Stats.offensiveEfficiency.toFixed(2)}) vs ${inputData.team2} (${simulation.team2Stats.offensiveEfficiency.toFixed(2)})</li>
            </ul>
        `;

        explanation += `
                <h4>Methodology</h4>
                <p>This analysis employs enhanced Monte Carlo simulations with ${simulation.numSimulations.toLocaleString()} iterations to generate probabilistic outcomes based on:</p>
                <ul>
                    <li>Historical head-to-head performance with recency-weighted analysis</li>
                    <li>Recent team form and scoring patterns</li>
                    <li>Match context (importance, location, type)</li>
                    <li>Team quality indicators and psychological factors</li>
                    <li>Advanced statistical modeling appropriate for ${inputData.sportsType}</li>
                </ul>
            </div>
        `;

        return explanation;
    }

    // Utility functions
    calculateForm(scores, opponentScores) {
        if (scores.length === 0) return 0.5;
        
        let formPoints = 0;
        let weightedMatches = 0;
        
        // Assuming scores are in chronological order (oldest to newest)
        for (let i = 0; i < Math.min(scores.length, opponentScores.length); i++) {
            // Apply recency weighting - more recent matches (higher indices) count more
            const matchWeight = 1 + (i * 0.1);  // Increases with index
            weightedMatches += matchWeight;
            
            if (scores[i] > opponentScores[i]) {
                formPoints += 3 * matchWeight; // Win
            } else if (scores[i] === opponentScores[i]) {
                formPoints += 1 * matchWeight; // Draw
            }
            // Loss: 0 points
        }
        
        // Normalize form points to a value between 0-1
        return formPoints / (weightedMatches * 3);
    }

    mean(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    standardDeviation(arr) {
        if (arr.length === 0) return 1;
        const avg = this.mean(arr);
        const variance = arr.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / arr.length;
        return Math.sqrt(variance);
    }

    normalRandom(mean, std) {
        // Box-Muller transformation for more accurate normal distribution
        let u = 0, v = 0;
        while(u === 0) u = Math.random();
        while(v === 0) v = Math.random();
        const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
        return z * std + mean;
    }

    poissonRandom(lambda) {
        // Poisson distribution using Knuth's algorithm
        const L = Math.exp(-lambda);
        let k = 0;
        let p = 1;
        
        do {
            k++;
            p *= Math.random();
        } while (p > L);
        
        return k - 1;
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('hidden');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }
}

// Initialize the analyzer when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const analyzer = new SportsAnalyzer();
    
    // Optional: Initialize chart display options if needed
    const colorModeSelector = document.getElementById('chart-color-mode');
    if (colorModeSelector) {
        colorModeSelector.value = analyzer.chartOptions.colorMode;
    }
    
    const displayModeSelector = document.getElementById('chart-display-mode');
    if (displayModeSelector) {
        displayModeSelector.value = analyzer.chartOptions.displayMode;
    }
});
        
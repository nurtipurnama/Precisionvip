class SportsAnalyzer {
    constructor() {
        this.initializeEventListeners();
        this.updateTeamLabels();
        this.charts = {};
        this.simulationResults = null;
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
    }

    updateTeamLabels() {
        const team1Name = document.getElementById('team1').value || 'Team 1';
        const team2Name = document.getElementById('team2').value || 'Team 2';

        // Update all labels that reference team names
        document.getElementById('h2h-team1-label').textContent = `${team1Name} Scores (comma separated)`;
        document.getElementById('h2h-team2-label').textContent = `${team2Name} Scores (comma separated)`;
        document.getElementById('team1-scores-label').textContent = `${team1Name} Scores (comma separated)`;
        document.getElementById('team2-scores-label').textContent = `${team2Name} Scores (comma separated)`;
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

            // Run Monte Carlo simulation
            this.simulationResults = await this.runMonteCarloSimulation(inputData);
            
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
        const numSimulations = 10000;
        const results = {
            team1Wins: 0,
            team2Wins: 0,
            draws: 0,
            team1Scores: [],
            team2Scores: [],
            totals: [],
            spreads: []
        };

        // Calculate team statistics
        const team1Stats = this.calculateTeamStats(data.team1Recent, data.team1OpponentRecent, data.h2hTeam1);
        const team2Stats = this.calculateTeamStats(data.team2Recent, data.team2OpponentRecent, data.h2hTeam2);

        // Calculate adjustment factors
        const adjustments = this.calculateAdjustments(data);

        // Run simulations
        for (let i = 0; i < numSimulations; i++) {
            const simulation = this.simulateMatch(team1Stats, team2Stats, adjustments, data);
            
            results.team1Scores.push(simulation.team1Score);
            results.team2Scores.push(simulation.team2Score);
            results.totals.push(simulation.total);
            
            if (simulation.team1Score > simulation.team2Score) {
                results.team1Wins++;
            } else if (simulation.team2Score > simulation.team1Score) {
                results.team2Wins++;
            } else {
                results.draws++;
            }

            // Calculate spread
            const spread = simulation.team1Score - simulation.team2Score;
            results.spreads.push(spread);
        }

        // Calculate probabilities
        const probabilities = this.calculateProbabilities(results, numSimulations, data);
        
        return {
            results,
            probabilities,
            team1Stats,
            team2Stats,
            adjustments,
            numSimulations
        };
    }

    calculateTeamStats(scores, opponentScores, h2hScores) {
        const allScores = [...scores, ...h2hScores];
        const allOpponentScores = [...opponentScores];
        
        return {
            avgScore: this.mean(allScores) || 1.5,
            stdScore: this.standardDeviation(allScores) || 1.0,
            avgConceded: this.mean(allOpponentScores) || 1.5,
            stdConceded: this.standardDeviation(allOpponentScores) || 1.0,
            form: this.calculateForm(scores, opponentScores),
            goalDifference: this.mean(allScores) - this.mean(allOpponentScores),
            matches: allScores.length
        };
    }

    calculateAdjustments(data) {
        let homeAdvantage = 0;
        let importanceMultiplier = 1;
        let typeMultiplier = 1;
        let rankingAdjustment = 0;

        // Home advantage
        if (data.location === 'home') {
            homeAdvantage = data.sportsType === 'basketball' ? 4 : 0.3;
        } else if (data.location === 'away') {
            homeAdvantage = data.sportsType === 'basketball' ? -4 : -0.3;
        }

        // Match importance
        const importanceMap = {
            'friendly': 0.9,
            'regular': 1.0,
            'tournament': 1.1,
            'cup': 1.2,
            'championship': 1.3
        };
        importanceMultiplier = importanceMap[data.matchImportance] || 1.0;

        // Match type
        const typeMap = {
            'regular-round': 1.0,
            'playoffs': 1.1,
            'knockout-stage': 1.15,
            'relegations': 1.2,
            'final': 1.25
        };
        typeMultiplier = typeMap[data.matchType] || 1.0;

        // Ranking adjustment
        if (data.team1Ranking && data.team2Ranking) {
            const rankingDiff = data.team2Ranking - data.team1Ranking;
            rankingAdjustment = rankingDiff * 0.02; // Small adjustment based on ranking
        }

        return {
            homeAdvantage,
            importanceMultiplier,
            typeMultiplier,
            rankingAdjustment
        };
    }

    simulateMatch(team1Stats, team2Stats, adjustments, data) {
        // Apply adjustments to expected scores
        let team1Expected = team1Stats.avgScore * adjustments.importanceMultiplier * adjustments.typeMultiplier + adjustments.homeAdvantage + adjustments.rankingAdjustment;
        let team2Expected = team2Stats.avgScore * adjustments.importanceMultiplier * adjustments.typeMultiplier - adjustments.homeAdvantage - adjustments.rankingAdjustment;

        // Ensure minimum expected scores
        team1Expected = Math.max(team1Expected, 0.1);
        team2Expected = Math.max(team2Expected, 0.1);

        // Generate scores using different distributions based on sport type
        let team1Score, team2Score;

        if (data.sportsType === 'basketball') {
            // Basketball: Use normal distribution (higher scores)
            team1Score = Math.max(0, Math.round(this.normalRandom(team1Expected, team1Stats.stdScore)));
            team2Score = Math.max(0, Math.round(this.normalRandom(team2Expected, team2Stats.stdScore)));
        } else {
            // Football: Use Poisson distribution (lower scores)
            team1Score = this.poissonRandom(team1Expected);
            team2Score = this.poissonRandom(team2Expected);
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
            }
        };

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

        return probs;
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

        return factors;
    }

    createCharts(simulation, inputData) {
        this.createTotalScoreChart(simulation, inputData);
        this.createScoreDistributionChart(simulation, inputData);
        this.createOutcomePieChart(simulation, inputData);
        this.createOverUnderChart(simulation, inputData);
        this.createSpreadChart(simulation, inputData);
    }

    createTotalScoreChart(simulation, inputData) {
        const ctx = document.getElementById('total-score-chart').getContext('2d');
        
        // Prepare data for match results
        const team1Name = inputData.team1;
        const team2Name = inputData.team2;
        
        // Calculate average scores
        const avgTeam1 = this.mean(simulation.results.team1Scores);
        const avgTeam2 = this.mean(simulation.results.team2Scores);
        
        if (this.charts.totalScore) {
            this.charts.totalScore.destroy();
        }

        this.charts.totalScore = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [team1Name, team2Name, 'Match 3', 'Match 4', 'Match 5'],
                datasets: [{
                    label: 'Simulated Average Scores',
                    data: [avgTeam1, avgTeam2, 0, 0, 0],
                    backgroundColor: ['#4ade80', '#f87171', '#22c55e', '#22c55e', '#22c55e'],
                    borderWidth: 0,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    createScoreDistributionChart(simulation, inputData) {
        const ctx = document.getElementById('score-distribution-chart').getContext('2d');
        
        // Create histogram of total scores
        const totals = simulation.results.totals;
        const minTotal = Math.min(...totals);
        const maxTotal = Math.max(...totals);
        const bins = [];
        const binSize = 1;
        
        for (let i = minTotal; i <= maxTotal; i += binSize) {
            bins.push(i);
        }
        
        const frequencies = bins.map(bin => 
            totals.filter(total => Math.floor(total / binSize) === Math.floor(bin / binSize)).length
        );

        if (this.charts.scoreDistribution) {
            this.charts.scoreDistribution.destroy();
        }

        this.charts.scoreDistribution = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: bins.slice(0, 10), // Show first 10 bins
                datasets: [{
                    label: 'Frequency',
                    data: frequencies.slice(0, 10),
                    backgroundColor: '#22c55e',
                    borderWidth: 0,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
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
                            text: 'Frequency'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'Total Score'
                        }
                    }
                }
            }
        });
    }

    createOutcomePieChart(simulation, inputData) {
        const ctx = document.getElementById('outcome-pie-chart').getContext('2d');
        
        const data = {
            labels: [`${inputData.team1} Win`, 'Draw', `${inputData.team2} Win`],
            datasets: [{
                data: [
                    (simulation.probabilities.team1Win * 100).toFixed(1),
                    (simulation.probabilities.draw * 100).toFixed(1),
                    (simulation.probabilities.team2Win * 100).toFixed(1)
                ],
                backgroundColor: ['#3b82f6', '#64748b', '#ef4444'],
                borderWidth: 0
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
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    }
                }
            }
        });
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

        if (this.charts.overUnder) {
            this.charts.overUnder.destroy();
        }

        this.charts.overUnder = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: ['#10b981', '#f59e0b'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    }
                }
            }
        });
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

        if (this.charts.spread) {
            this.charts.spread.destroy();
        }

        this.charts.spread = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: ['#8b5cf6', '#f97316'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    }
                }
            }
        });
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

        let explanation = `
            <div class="explanation-content">
                <h4>Monte Carlo Analysis Summary</h4>
                <p>Based on ${simulation.numSimulations.toLocaleString()} simulations using historical match data, statistical analysis, and various contextual factors.</p>
                
                <h4>Key Findings</h4>
                <ul>
                    <li><strong>Most Likely Winner:</strong> ${winner} (${(winnerProb * 100).toFixed(1)}% probability)</li>
                    <li><strong>Expected Total Score:</strong> ${avgTotal.toFixed(1)} goals/points</li>
                    <li><strong>Draw Probability:</strong> ${(probs.draw * 100).toFixed(1)}%</li>
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
                    <li><strong>Total ${inputData.totalLine}:</strong> ${probs.total.over > probs.total.under ? 'Over' : 'Under'} (${Math.max(probs.total.over, probs.total.under) * 100}% confidence)</li>
                </ul>
            `;
        }

        if (probs.spread) {
            const favoriteTeam = inputData.favoredTeam === 'team1' ? inputData.team1 : inputData.team2;
            explanation += `
                <ul>
                    <li><strong>Spread Bet:</strong> ${probs.spread.favorite > 0.5 ? favoriteTeam + ' -' + inputData.spreadLine : 'Underdog +' + inputData.spreadLine} (${Math.max(probs.spread.favorite, probs.spread.underdog) * 100}% confidence)</li>
                </ul>
            `;
        }

        explanation += `
                <h4>Methodology</h4>
                <p>This analysis employs Monte Carlo simulations to generate probabilistic outcomes based on:</p>
                <ul>
                    <li>Historical head-to-head performance</li>
                    <li>Recent team form and scoring patterns</li>
                    <li>Match context (importance, location, type)</li>
                    <li>Statistical modeling appropriate for ${inputData.sportsType}</li>
                </ul>
            </div>
        `;

        return explanation;
    }

    // Utility functions
    calculateForm(scores, opponentScores) {
        if (scores.length === 0) return 0.5;
        
        let formPoints = 0;
        for (let i = 0; i < Math.min(scores.length, opponentScores.length); i++) {
            if (scores[i] > opponentScores[i]) formPoints += 3;
            else if (scores[i] === opponentScores[i]) formPoints += 1;
        }
        
        return formPoints / (Math.min(scores.length, opponentScores.length) * 3);
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
        // Box-Muller transformation
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
    new SportsAnalyzer();
});
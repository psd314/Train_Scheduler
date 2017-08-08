var trainName;
var destination;
var firstTrain;
var frequency;
var nextArrival;
var minutesAway;
var currentTime;
var remainder;
var firstTrainConverted;

var config = {
    apiKey: "AIzaSyC5zV5UaxClj8kCIbEu4fF2fuWz2C-ZAvk",
    authDomain: "train-scheduler-20722.firebaseapp.com",
    databaseURL: "https://train-scheduler-20722.firebaseio.com",
    projectId: "train-scheduler-20722",
    storageBucket: "train-scheduler-20722.appspot.com",
    messagingSenderId: "187745237012"
};
firebase.initializeApp(config);

var database = firebase.database();
// var connectionsRef = database.ref("/connections");
// var connectedRef = database.ref(".info/connected");

$(document).ready(function() {

    $("#submitBtn").on("click", function(event) {
        event.preventDefault();

        trainName = $('#trainName').val().trim();
        destination = $('#destination').val().trim();
        firstTrain = $('#firstTrain').val().trim();
        frequency = $('#frequency').val().trim();

        // Solved Mathematically
        // Test case 1:
        // 16 - 00 = 16
        // 16 % 3 = 1 (Modulus is the remainder)
        // 3 - 1 = 2 minutes away
        // 2 + 3:16 = 3:18

        // Solved Mathematically
        // Test case 2:
        // 16 - 00 = 16
        // 16 % 7 = 2 (Modulus is the remainder)
        // 7 - 2 = 5 minutes away
        // 5 + 3:16 = 3:21
        firstTrainConverted = moment(firstTrain, "HH:mm").subtract(1, "years");
        remainder = moment().diff(moment(firstTrainConverted), "minutes") % parseInt(frequency);
        minutesAway = parseInt(frequency) - parseInt(remainder);
        nextArrival = moment().add(minutesAway, 'minutes').format("HH:mm");

        database.ref().push({
            trainName: trainName,
            destination: destination,
            frequency: frequency,
            nextArrival: nextArrival,
            minutesAway: minutesAway
        });

        // console.log("CURRENT TIME: " + moment(currentTime).format("HH:mm"));
        console.log('min away ' + minutesAway);
        console.log('next ' + nextArrival);
        // (current time - initial) % frequency
        // remainder + current time

        // do calculations
        // write to firebase
    });

    database.ref().on("child_added", function(snapshot) {
        $(".table").append("<tr><td>" + trainName + "</td><td>" + destination + "</td><td>" +
            frequency + "</td><td>" + nextArrival + "</td><td>" + minutesAway + "</td></tr>");
    }, function(errorObject) {
        console.log("Errors handled: " + errorObject.code);
    });
});
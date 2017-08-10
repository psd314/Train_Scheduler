var trainName;
var destination;
var firstTrain;
var frequency;
var nextArrival;
var minutesAway;
var currentTime;
var remainder;
var firstTrainConverted;
var timer = 60;
var childList = [];
var pushTrainObj;
var row;
var fbId;

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

function trainObj(childId, trainName, destination, frequency, nextArrival, minutesAway, firstTrain) {
    this.childId = childId,
        this.trainName = trainName,
        this.destination = destination,
        this.frequency = frequency,
        this.nextArrival = nextArrival,
        this.minutesAway = minutesAway,
        this.firstTrain = firstTrain
}

function arrivalUpdate() {
    intervalId = setInterval(function() {
        timer--;
        if (timer === 0) {
            clearInterval(intervalId);
            timer = 60;
            if (childList.length > 0) {
                // iterate through array of trainObjs, calculate new values for minutesAway and
                // nextArrival for each train and pass to firebase
                for (var i = 0; i < childList.length; i++) {
                    // check if minutes away > freq
                    if (childList[i].minutesAway > childList[i].frequency) {
                        // calculate minutesAway as nextArrival - moment() until minutes away is equal to
                        // normal frequency where regular calculations will resume.
                        childList[i].minutesAway = moment(childList[i].nextArrival, "HH:mm").diff(moment(), 'minutes');
                        database.ref(childList[i].childId).update({
                            minutesAway: childList[i].minutesAway
                        });

                    } else {
                        // calculate minutesAway and nextArrival normally
                        var firstTimeConvert = moment(childList[i].firstTrain, "HH:mm").subtract(1, "years");
                        var remain = moment().diff(moment(firstTimeConvert), "minutes") % parseInt(childList[i].frequency);

                        childList[i].minutesAway = parseInt(childList[i].frequency) - parseInt(remain);
                        childList[i].nextArrival = moment().add(childList[i].minutesAway, 'minutes').format("HH:mm");

                        database.ref(childList[i].childId).update({
                            nextArrival: childList[i].nextArrival,
                            minutesAway: childList[i].minutesAway
                        });
                    }

                    if (i === childList.length - 1) {
                        // update html table only once on last for-loop iteration, for optimization.  Avoid
                        // rewriting the table after every update to firebase 
                        database.ref().once("value", function(snap) {
                            $.each(snap.val(), function(k, v) {
                                $(`tr[data-id='${k}'`).html(`<td>${v.trainName}</td><td>${v.destination}</td><td>${v.frequency}</td>
                                	<td>${v.nextArrival}</td><td>${v.minutesAway}</td>
                                	<td><button type='button' class='btn btn-default update'><i class='fa fa-pencil' aria-hidden='true'></i></button></td>
            						<td><button type='button' class='btn btn-default remove'><i class='fa fa-trash' aria-hidden='true'></i></button></td>`); // add update and remove buttons to string
                            });
                        });
                    }
                }
            }
            arrivalUpdate();
        }
        console.log(timer);
    }, 1000);
}
//https://train-scheduler-20722.firebaseapp.com/__/auth/handler
$(document).ready(function() {
    arrivalUpdate();
    // add new train to table
    $("#submitBtn").on("click", function(event) {
        event.preventDefault();
        // retrieve user inputs
        trainName = $('#trainName').val().trim();
        destination = $('#destination').val().trim();
        firstTrain = $('#firstTrain').val().trim();
        frequency = $('#frequency').val().trim();

        $('#trainName').val("");
        $('#destination').val("");
        $('#firstTrain').val("");
        $('#frequency').val("");

        // make calculations for minutes remaining and next train arrival
        firstTrainConverted = moment(firstTrain, "HH:mm").subtract(1, "years");
        remainder = moment().diff(moment(firstTrainConverted), "minutes") % parseInt(frequency);
        minutesAway = parseInt(frequency) - parseInt(remainder);
        nextArrival = moment().add(minutesAway, 'minutes').format("HH:mm");

        database.ref().push({
            trainName: trainName,
            destination: destination,
            frequency: frequency,
            nextArrival: nextArrival,
            minutesAway: minutesAway,
            firstTrain: firstTrain
        });
    });

    // remove train from list of trainObj's and firebase
    $('table').on('click', '.remove', function() {
        var dataId = $(this).parent().parent().attr('data-id');
        childList.splice(dataId);
        database.ref(dataId).remove();
    });

    $('table').on('click', '.update', function() {
    	// disable buttons while changes are being made
        $(this).removeClass('update').addClass('confirm');
        $('.update').attr('disabled', 'disabled');
        $('button.remove').attr('disabled', 'disabled');
        $('button[type="submit"]').attr('disabled', 'disabled');
        $(this)[0].innerHTML = "Confirm";
        row = $(this).parent().parent()[0].children;
        fbId = $(this).parent().parent().attr('data-id');

        // check for matching id in array of trainObj's with data-id in 
        // corresponding row tag
        for (var i = 0; i < childList.length; i++) {
            if (childList[i].childId === fbId) {
                index = i;
            }
        }
        // use index to get correct trainObj from childList array and
        // use to populate values
        $(row[0]).html(`<input type='text' id='newTrain${index}' class='form-control' value='${childList[index].trainName}'>`);
        $(row[1]).html(`<input type='text' id='newDest${index}' class='form-control' value='${childList[index].destination}'>`);
        $(row[3]).html(`<input type='text' id='newArrival${index}' class='form-control' value='${childList[index].nextArrival}'>`);
    });

    // confirm edits to table, write to firebase
    $('table').on('click', '.confirm', function() {
    	// enable buttons again once changes are complete
        $('.update').removeAttr('disabled');
        $('button.remove').removeAttr('disabled');
        $('button[type="submit"]').removeAttr('disabled');
        $(this)[0].innerHTML = "<i class='fa fa-pencil' aria-hidden='true'></i>";
        $(this).removeClass('confirm').addClass('update');

        // finding trainObj with matching firebase id in childList
        for (var i = 0; i < childList.length; i++) {
            if (childList[i].childId === fbId) {
                index = i;
            }
        }
        var newTrainName = $(`#newTrain${index}`).val().trim();
        var newDest = $(`#newDest${index}`).val().trim();
        var newArrival = $(`#newArrival${index}`).val().trim();
        var currentFreq = parseInt($(row[2]).html());
        // if new values match old values replace html inputs with old
        // values and do not write to firebase
        if (newTrainName === childList[index].trainName && newDest === childList[index].destination &&
            newArrival === childList[index].nextArrival) {
            $(row[0]).html(`<td>${newTrainName}</td>`);
            $(row[1]).html(`<td>${newDest}</td>`);
            $(row[3]).html(`<td>${newArrival}</td>`);
        } else if (moment(newArrival, "HH:mm").isBefore(moment()) || moment(newArrival, "HH:mm").isSame(moment())) {
            // if newArrival is before present moment(), add 1 day to newArrival then take difference
            var newArrivalDiff = moment(newArrival, "HH:mm").add(1, 'd').diff(moment(), 'minutes');
            childList[index].trainName = newTrainName;
            childList[index].destination = newDest;
            childList[index].nextArrival = newArrival;
            childList[index].minutesAway = newArrivalDiff;

            database.ref(childList[index].childId).update({
                trainName: newTrainName,
                destination: newDest,
                nextArrival: newArrival,
                minutesAway: newArrivalDiff
            });

        } else if (moment(newArrival, "HH:mm").isAfter(moment()) &&
            moment(newArrival, "HH:mm").diff(moment(), 'minutes') > childList[index].frequency) {
            var sameDayArrival = moment(newArrival, "HH:mm").diff(moment(), 'minutes');
            // testing if newArrival is after present moment() and if minutesAway is greater than
            // frequency
            childList[index].trainName = newTrainName;
            childList[index].destination = newDest;
            childList[index].nextArrival = newArrival;
            childList[index].minutesAway = newArrivalDiff;

            database.ref(childList[index].childId).update({
                trainName: newTrainName,
                destination: newDest,
                nextArrival: newArrival,
                minutesAway: sameDayArrival
            });
        } else { // normal calculations				
            //update childList with new values
            childList[index].trainName = newTrainName;
            childList[index].destination = newDest;
            childList[index].nextArrival = newArrival;

            database.ref(childList[index].childId).update({
                trainName: newTrainName,
                destination: newDest,
                nextArrival: newArrival
            });
        }
    });


    // update changes to row with firebase repsonse
    database.ref().on("child_changed", function(snap) {
        if (row !== undefined) {
            $(row[0]).html(`<td>${snap.val().trainName}</td>`);
            $(row[1]).html(`<td>${snap.val().destination}</td>`);
            $(row[3]).html(`<td>${snap.val().nextArrival}</td>`);
            $(row[4]).html(`<td>${snap.val().minutesAway}</td>`);
        }
    });

    // on-value change in firebase, update array of trainObj's 
    // to match trains in the html table
    database.ref().on("value", function(snap) {
        childList = [];
        $.each(snap.val(), function(k, v) {
            v.childId = k;
            childList.push(v);
        });
    });

    database.ref().on("child_removed", function(snap) {
        $(`tr[data-id='${snap.val().childId}']`).remove();
    });

    // google auth???? check docs

    // create new trainObj instance and write train info to html table
    database.ref().on("child_added", function(snap) {
        // trainObj args (childId, trainName, destination, frequency, nextArrival, minutesAway, firstTrain)
        pushTrainObj = new trainObj(snap.Gt.path.ct[0], snap.val().trainName, snap.val().destination, snap.val().frequency,
            snap.val().nextArrival, snap.val().minutesAway, snap.val().firstTrain);
        // add childId to firebase too
        database.ref(snap.Gt.path.ct[0]).update({
            childId: snap.Gt.path.ct[0]
        });

        $(".table").append(`<tr data-id='${snap.Gt.path.ct[0]}'><td>` + snap.val().trainName + "</td><td>" + snap.val().destination + "</td><td>" +
            snap.val().frequency + "</td><td>" + snap.val().nextArrival + "</td><td>" + snap.val().minutesAway +
            "</td><td><button type='button' class='btn btn-default update'><i class='fa fa-pencil' aria-hidden='true'></i></button></td>" +
            "<td><button type='button' class='btn btn-default remove'><i class='fa fa-trash ' aria-hidden='true'></i></button></td></tr>");
    }, function(errorObject) {
        console.log("Errors handled: " + errorObject.code);
    });
});
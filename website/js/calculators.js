(function () {
  var ACTIVITY = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extra_active: 1.9,
  };
  var MIN_CALORIES = { male: 1500, female: 1200 };
  var KCAL_PER_KG = 7700;
  var LB_PER_KG = 2.2046226218;
  var CM_PER_IN = 2.54;

  function num(id) {
    var el = document.getElementById(id);
    return el ? parseFloat(el.value) : NaN;
  }

  function checked(name) {
    var el = document.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : "";
  }

  function pressed(id) {
    var el = document.getElementById(id);
    return el && el.getAttribute("aria-pressed") === "true";
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) {
      el.textContent = value;
    }
  }

  function toKg() {
    var weight = num("weight");
    if (!isFinite(weight) || weight <= 0) {
      return NaN;
    }
    return pressed("unit-lb") ? weight / LB_PER_KG : weight;
  }

  function toCm() {
    if (pressed("unit-ft")) {
      var feet = num("height-ft");
      var inches = num("height-in") || 0;
      if (!isFinite(feet) || feet < 0) {
        return NaN;
      }
      return (feet * 12 + inches) * CM_PER_IN;
    }
    var cm = num("height-cm");
    return cm > 0 ? cm : NaN;
  }

  function calculateBmr(weightKg, heightCm, age, gender) {
    var base = 10 * weightKg + 6.25 * heightCm - 5 * age;
    return gender === "male" ? base + 5 : base - 161;
  }

  function calorieAdjustment(goalType, currentKg, goalKg) {
    if (goalType === "maintain") {
      return 0;
    }
    var diffKg = Math.abs(goalKg - currentKg);
    var kgPerWeek =
      goalType === "lose"
        ? Math.min(0.75, Math.max(0.25, diffKg >= 5 ? 0.5 : 0.35))
        : Math.min(0.5, Math.max(0.2, diffKg >= 5 ? 0.35 : 0.25));
    var daily = Math.round((kgPerWeek * KCAL_PER_KG) / 7);
    return goalType === "lose" ? -daily : daily;
  }

  function dailyTarget(maintenance, adjustment, gender, goalType) {
    if (goalType === "maintain") {
      return maintenance;
    }
    return Math.max(MIN_CALORIES[gender], Math.round(maintenance + adjustment));
  }

  function bmiLabel(bmi) {
    if (bmi < 18.5) {
      return "Underweight";
    }
    if (bmi < 25) {
      return "Healthy range";
    }
    if (bmi < 30) {
      return "Overweight";
    }
    return "Obese range";
  }

  function bindUnits() {
    var kg = document.getElementById("unit-kg");
    var lb = document.getElementById("unit-lb");
    var cm = document.getElementById("unit-cm");
    var ft = document.getElementById("unit-ft");
    var heightCmInput = document.getElementById("height-cm");
    var imperial = document.getElementById("height-imperial");
    var weightInput = document.getElementById("weight");

    function setWeight(useLb) {
      var current = parseFloat(weightInput.value);
      var wasLb = pressed("unit-lb");
      if (isFinite(current) && useLb !== wasLb) {
        weightInput.value = useLb
          ? (current * LB_PER_KG).toFixed(1)
          : (current / LB_PER_KG).toFixed(1);
      }
      var goalInput = document.getElementById("goal-weight");
      var goalVal = goalInput ? parseFloat(goalInput.value) : NaN;
      if (goalInput && isFinite(goalVal) && useLb !== wasLb) {
        goalInput.value = useLb
          ? (goalVal * LB_PER_KG).toFixed(1)
          : (goalVal / LB_PER_KG).toFixed(1);
      }
      kg.setAttribute("aria-pressed", useLb ? "false" : "true");
      lb.setAttribute("aria-pressed", useLb ? "true" : "false");
      weightInput.placeholder = useLb ? "154" : "70";
    }

    function setHeight(useFt) {
      var wasFt = pressed("unit-ft");
      if (useFt && !wasFt) {
        var totalIn = num("height-cm") / CM_PER_IN;
        if (isFinite(totalIn) && totalIn > 0) {
          document.getElementById("height-ft").value = String(
            Math.floor(totalIn / 12)
          );
          document.getElementById("height-in").value = (totalIn % 12).toFixed(1);
        }
      }
      if (!useFt && wasFt) {
        var feet = num("height-ft");
        var inches = num("height-in") || 0;
        if (isFinite(feet)) {
          heightCmInput.value = String(Math.round((feet * 12 + inches) * CM_PER_IN));
        }
      }
      cm.setAttribute("aria-pressed", useFt ? "false" : "true");
      ft.setAttribute("aria-pressed", useFt ? "true" : "false");
      heightCmInput.hidden = useFt;
      imperial.classList.toggle("is-on", useFt);
    }

    kg.addEventListener("click", function () {
      setWeight(false);
      update();
    });
    lb.addEventListener("click", function () {
      setWeight(true);
      update();
    });
    cm.addEventListener("click", function () {
      setHeight(false);
      update();
    });
    ft.addEventListener("click", function () {
      setHeight(true);
      update();
    });
  }

  function toggleGoalWeight() {
    var wrap = document.getElementById("goal-weight-wrap");
    var goal = checked("goal");
    wrap.hidden = goal === "maintain";
  }

  function update() {
    toggleGoalWeight();

    var age = num("age");
    var gender = checked("gender");
    var activity = document.getElementById("activity").value;
    var goal = checked("goal");
    var weightKg = toKg();
    var heightCm = toCm();
    var goalKg = num("goal-weight");

    if (pressed("unit-lb") && isFinite(goalKg)) {
      goalKg = goalKg / LB_PER_KG;
    }

    var ready =
      age >= 13 &&
      age <= 100 &&
      (gender === "male" || gender === "female") &&
      isFinite(weightKg) &&
      isFinite(heightCm) &&
      heightCm > 50 &&
      ACTIVITY[activity];

    if (!ready) {
      return;
    }

    if (goal !== "maintain" && !(goalKg > 0)) {
      return;
    }

    var bmrRaw = calculateBmr(weightKg, heightCm, age, gender);
    var bmr = Math.round(bmrRaw);
    var tdee = Math.round(bmrRaw * ACTIVITY[activity]);
    var adjustment = calorieAdjustment(goal, weightKg, goalKg || weightKg);
    var target = dailyTarget(tdee, adjustment, gender, goal);
    var weekly =
      Math.round((Math.abs(adjustment) * 7 * 10) / KCAL_PER_KG) / 10;
    var bmi = weightKg / Math.pow(heightCm / 100, 2);

    setText("out-target", target.toLocaleString());
    setText(
      "out-target-caption",
      goal === "lose"
        ? "Daily target to lose"
        : goal === "gain"
          ? "Daily target to gain"
          : "Daily maintenance target"
    );
    setText("out-bmr", bmr.toLocaleString() + " kcal");
    setText("out-tdee", tdee.toLocaleString() + " kcal");
    setText(
      "out-change",
      adjustment === 0
        ? "Hold steady"
        : (adjustment > 0 ? "+" : "") +
            adjustment.toLocaleString() +
            " kcal/day"
    );
    setText(
      "out-week",
      weekly === 0 ? "—" : weekly.toFixed(1) + " kg / week"
    );
    setText("out-bmi", bmi.toFixed(1));
    setText("out-bmi-label", bmiLabel(bmi));

    updateMacros(target);
  }

  function updateMacros(calories) {
    var preset = document.getElementById("macro-preset").value;
    var split = {
      balanced: { p: 0.3, c: 0.4, f: 0.3 },
      protein: { p: 0.4, c: 0.3, f: 0.3 },
      lowercarb: { p: 0.4, c: 0.2, f: 0.4 },
    }[preset];

    var pCal = Math.round(calories * split.p);
    var fCal = Math.round(calories * split.f);
    var cCal = calories - pCal - fCal;

    setText("macro-calories", calories.toLocaleString() + " kcal");
    setText("macro-p-g", Math.round(pCal / 4) + " g");
    setText("macro-c-g", Math.round(cCal / 4) + " g");
    setText("macro-f-g", Math.round(fCal / 9) + " g");
    setText("macro-p-cal", pCal.toLocaleString() + " kcal");
    setText("macro-c-cal", cCal.toLocaleString() + " kcal");
    setText("macro-f-cal", fCal.toLocaleString() + " kcal");

    document.getElementById("bar-p").style.width = split.p * 100 + "%";
    document.getElementById("bar-c").style.width = split.c * 100 + "%";
    document.getElementById("bar-f").style.width = split.f * 100 + "%";
  }

  var form = document.getElementById("calorie-form");
  if (!form) {
    return;
  }

  bindUnits();
  form.addEventListener("input", update);
  form.addEventListener("change", update);
  document.getElementById("macro-preset").addEventListener("change", update);
  update();
})();
